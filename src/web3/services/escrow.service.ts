import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscrowContract, EscrowMilestone, EscrowStatus, MilestoneStatus } from '../entities/escrow.entity';
import { ThirdwebService } from './thirdweb.service';
import { ConfigService } from '@nestjs/config';
export interface CreateEscrowDto {
  creatorId: string;
  makerId: string;
  totalAmount: number;
  nftId?: string;
  chatId?: string;
  milestones: Array<{
    name: string;
    description: string;
    percentage: number;
    dueDate?: Date;
  }>;
}
export interface FundEscrowDto {
  escrowId: string;
  transactionHash: string;
}
export interface ReleaseMilestoneDto {
  milestoneId: string;
  transactionHash?: string;
}
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private readonly escrowContractAddress: string;
  constructor(
    @InjectRepository(EscrowContract)
    private escrowRepository: Repository<EscrowContract>,
    @InjectRepository(EscrowMilestone)
    private milestoneRepository: Repository<EscrowMilestone>,
    private thirdwebService: ThirdwebService,
    private configService: ConfigService,
  ) {
    this.escrowContractAddress = this.configService.get<string>('ESCROW_CONTRACT_ADDRESS');
  }
  async createEscrow(dto: CreateEscrowDto): Promise<EscrowContract> {
    try {
      const contractAddress = this.escrowContractAddress || await this.deployEscrowContract();
      const escrow = this.escrowRepository.create({
        contractAddress,
        totalAmount: dto.totalAmount,
        creatorId: dto.creatorId,
        makerId: dto.makerId,
        nftId: dto.nftId,
        chatId: dto.chatId,
        status: EscrowStatus.CREATED,
      });
      const savedEscrow = await this.escrowRepository.save(escrow);
      const milestones = dto.milestones.map((milestone, index) => {
        const amount = (dto.totalAmount * milestone.percentage) / 100;
        return this.milestoneRepository.create({
          name: milestone.name,
          description: milestone.description,
          percentage: milestone.percentage,
          amount,
          order: index,
          escrowId: savedEscrow.id,
          dueDate: milestone.dueDate,
          status: MilestoneStatus.PENDING,
        });
      });
      await this.milestoneRepository.save(milestones);
      const escrowWithMilestones = await this.findById(savedEscrow.id);
      this.logger.log(`Escrow created: ${savedEscrow.id} - ${dto.totalAmount} total`);
      return escrowWithMilestones;
    } catch (error) {
      this.logger.error(`Failed to create escrow: ${error.message}`);
      throw error;
    }
  }
  async fundEscrow(dto: FundEscrowDto): Promise<EscrowContract> {
    try {
      const escrow = await this.findById(dto.escrowId);
      if (escrow.status !== EscrowStatus.CREATED) {
        throw new Error('Escrow is not in created status');
      }
      escrow.status = EscrowStatus.FUNDED;
      escrow.transactionHash = dto.transactionHash;
      escrow.fundedAt = new Date();
      const firstMilestone = escrow.milestones.find(m => m.order === 0);
      if (firstMilestone) {
        firstMilestone.status = MilestoneStatus.IN_PROGRESS;
        await this.milestoneRepository.save(firstMilestone);
      }
      const fundedEscrow = await this.escrowRepository.save(escrow);
      this.logger.log(`Escrow funded: ${dto.escrowId} - ${dto.transactionHash}`);
      return fundedEscrow;
    } catch (error) {
      this.logger.error(`Failed to fund escrow: ${error.message}`);
      throw error;
    }
  }
  async completeMilestone(milestoneId: string): Promise<EscrowMilestone> {
    try {
      const milestone = await this.milestoneRepository.findOne({
        where: { id: milestoneId },
        relations: ['escrow'],
      });
      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }
      if (milestone.status !== MilestoneStatus.IN_PROGRESS) {
        throw new Error('Milestone is not in progress');
      }
      milestone.status = MilestoneStatus.COMPLETED;
      milestone.completedAt = new Date();
      const completedMilestone = await this.milestoneRepository.save(milestone);
      this.logger.log(`Milestone completed: ${milestoneId}`);
      return completedMilestone;
    } catch (error) {
      this.logger.error(`Failed to complete milestone: ${error.message}`);
      throw error;
    }
  }
  async approveMilestone(dto: ReleaseMilestoneDto): Promise<EscrowMilestone> {
    try {
      const milestone = await this.milestoneRepository.findOne({
        where: { id: dto.milestoneId },
        relations: ['escrow'],
      });
      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }
      if (milestone.status !== MilestoneStatus.COMPLETED) {
        throw new Error('Milestone must be completed before approval');
      }
      if (dto.transactionHash) {
        milestone.transactionHash = dto.transactionHash;
      }
      milestone.status = MilestoneStatus.APPROVED;
      milestone.approvedAt = new Date();
      const approvedMilestone = await this.milestoneRepository.save(milestone);
      await this.startNextMilestone(milestone.escrowId, milestone.order);
      await this.checkEscrowCompletion(milestone.escrowId);
      this.logger.log(`Milestone approved: ${dto.milestoneId}`);
      return approvedMilestone;
    } catch (error) {
      this.logger.error(`Failed to approve milestone: ${error.message}`);
      throw error;
    }
  }
  async disputeMilestone(milestoneId: string, reason: string): Promise<EscrowMilestone> {
    try {
      const milestone = await this.milestoneRepository.findOne({
        where: { id: milestoneId },
        relations: ['escrow'],
      });
      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }
      milestone.status = MilestoneStatus.DISPUTED;
      milestone.metadata = {
        ...milestone.metadata,
        disputeReason: reason,
        disputedAt: new Date().toISOString(),
      };
      const disputedMilestone = await this.milestoneRepository.save(milestone);
      const escrow = await this.findById(milestone.escrowId);
      escrow.status = EscrowStatus.DISPUTED;
      await this.escrowRepository.save(escrow);
      this.logger.log(`Milestone disputed: ${milestoneId} - ${reason}`);
      return disputedMilestone;
    } catch (error) {
      this.logger.error(`Failed to dispute milestone: ${error.message}`);
      throw error;
    }
  }
  async findById(id: string): Promise<EscrowContract> {
    const escrow = await this.escrowRepository.findOne({
      where: { id },
      relations: ['creator', 'maker', 'nft', 'chat', 'milestones'],
      order: { milestones: { order: 'ASC' } },
    });
    if (!escrow) {
      throw new NotFoundException(`Escrow with ID ${id} not found`);
    }
    return escrow;
  }
  async findByCreator(creatorId: string): Promise<EscrowContract[]> {
    return this.escrowRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
      relations: ['creator', 'maker', 'nft', 'milestones'],
    });
  }
  async findByMaker(makerId: string): Promise<EscrowContract[]> {
    return this.escrowRepository.find({
      where: { makerId },
      order: { createdAt: 'DESC' },
      relations: ['creator', 'maker', 'nft', 'milestones'],
    });
  }
  async findByChat(chatId: string): Promise<EscrowContract[]> {
    return this.escrowRepository.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
      relations: ['creator', 'maker', 'nft', 'milestones'],
    });
  }
  async getEscrowStats(escrowId: string): Promise<{
    totalMilestones: number;
    completedMilestones: number;
    approvedMilestones: number;
    releasedAmount: number;
    remainingAmount: number;
    progressPercentage: number;
  }> {
    const escrow = await this.findById(escrowId);
    const totalMilestones = escrow.milestones.length;
    const completedMilestones = escrow.milestones.filter(m => m.status === MilestoneStatus.COMPLETED).length;
    const approvedMilestones = escrow.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;
    const releasedAmount = escrow.milestones
      .filter(m => m.status === MilestoneStatus.APPROVED)
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const remainingAmount = Number(escrow.totalAmount) - releasedAmount;
    const progressPercentage = totalMilestones > 0 ? (approvedMilestones / totalMilestones) * 100 : 0;
    return {
      totalMilestones,
      completedMilestones,
      approvedMilestones,
      releasedAmount,
      remainingAmount,
      progressPercentage,
    };
  }
  private async startNextMilestone(escrowId: string, currentOrder: number): Promise<void> {
    const nextMilestone = await this.milestoneRepository.findOne({
      where: { escrowId, order: currentOrder + 1, status: MilestoneStatus.PENDING },
    });
    if (nextMilestone) {
      nextMilestone.status = MilestoneStatus.IN_PROGRESS;
      await this.milestoneRepository.save(nextMilestone);
      this.logger.log(`Next milestone started: ${nextMilestone.id}`);
    }
  }
  private async checkEscrowCompletion(escrowId: string): Promise<void> {
    const escrow = await this.findById(escrowId);
    const allMilestonesApproved = escrow.milestones.every(
      m => m.status === MilestoneStatus.APPROVED
    );
    if (allMilestonesApproved) {
      escrow.status = EscrowStatus.COMPLETED;
      escrow.completedAt = new Date();
      await this.escrowRepository.save(escrow);
      this.logger.log(`Escrow completed: ${escrowId}`);
    }
  }
  private async deployEscrowContract(): Promise<string> {
    try {
      const contractAddress = await this.thirdwebService.deployEscrowContract();
      this.logger.log(`Escrow contract deployed: ${contractAddress}`);
      return contractAddress;
    } catch (error) {
      this.logger.error(`Escrow contract deployment failed: ${error.message}`);
      throw error;
    }
  }
  async cancelEscrow(escrowId: string, reason: string): Promise<EscrowContract> {
    try {
      const escrow = await this.findById(escrowId);
      if (escrow.status === EscrowStatus.COMPLETED) {
        throw new Error('Cannot cancel completed escrow');
      }
      escrow.status = EscrowStatus.CANCELLED;
      for (const milestone of escrow.milestones) {
        if (milestone.status === MilestoneStatus.PENDING || milestone.status === MilestoneStatus.IN_PROGRESS) {
          milestone.status = MilestoneStatus.DISPUTED;
          milestone.metadata = {
            ...milestone.metadata,
            cancellationReason: reason,
            cancelledAt: new Date().toISOString(),
          };
          await this.milestoneRepository.save(milestone);
        }
      }
      const cancelledEscrow = await this.escrowRepository.save(escrow);
      this.logger.log(`Escrow cancelled: ${escrowId} - ${reason}`);
      return cancelledEscrow;
    } catch (error) {
      this.logger.error(`Failed to cancel escrow: ${error.message}`);
      throw error;
    }
  }

  async getEscrowBalanceByChat(chatId: string): Promise<{
    escrowId: string;
    chatId: string;
    contractAddress: string;
    creatorId: string;
    makerId: string;
    totalAmount: number;
    releasedAmount: number;
    remainingBalance: number;
    escrowStatus: EscrowStatus;
    progressPercentage: number;
    milestones: {
      total: number;
      completed: number;
      approved: number;
      pending: number;
      details: Array<{
        id: string;
        name: string;
        description: string;
        amount: number;
        percentage: number;
        status: MilestoneStatus;
        order: number;
        dueDate: Date | null;
        completedAt: Date | null;
        approvedAt: Date | null;
        transactionHash: string | null;
      }>;
    };
    fundingTransactionHash: string | null;
    fundedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      // Find all escrows for this chat
      const escrows = await this.findByChat(chatId);

      if (!escrows || escrows.length === 0) {
        throw new NotFoundException(`No escrow found for chat ID ${chatId}`);
      }

      // Get the most recent active escrow (funded or in_progress), or fall back to the first one
      const activeEscrow = escrows.find(e =>
        e.status === EscrowStatus.FUNDED || e.status === EscrowStatus.IN_PROGRESS
      ) || escrows[0];

      // Get detailed stats for the escrow
      const stats = await this.getEscrowStats(activeEscrow.id);

      // Build comprehensive balance information
      const balanceInfo = {
        escrowId: activeEscrow.id,
        chatId: activeEscrow.chatId,
        contractAddress: activeEscrow.contractAddress,
        creatorId: activeEscrow.creatorId,
        makerId: activeEscrow.makerId,
        totalAmount: Number(activeEscrow.totalAmount),
        releasedAmount: stats.releasedAmount,
        remainingBalance: stats.remainingAmount,
        escrowStatus: activeEscrow.status,
        progressPercentage: stats.progressPercentage,
        milestones: {
          total: stats.totalMilestones,
          completed: stats.completedMilestones,
          approved: stats.approvedMilestones,
          pending: stats.totalMilestones - stats.completedMilestones,
          details: activeEscrow.milestones.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            amount: Number(m.amount),
            percentage: Number(m.percentage),
            status: m.status,
            order: m.order,
            dueDate: m.dueDate,
            completedAt: m.completedAt,
            approvedAt: m.approvedAt,
            transactionHash: m.transactionHash,
          }))
        },
        fundingTransactionHash: activeEscrow.transactionHash,
        fundedAt: activeEscrow.fundedAt,
        completedAt: activeEscrow.completedAt,
        createdAt: activeEscrow.createdAt,
        updatedAt: activeEscrow.updatedAt,
      };

      this.logger.log(`Escrow balance retrieved for chat ${chatId} - Escrow ID: ${activeEscrow.id}, Remaining: ${stats.remainingAmount}`);

      return balanceInfo;
    } catch (error) {
      this.logger.error(`Failed to get escrow balance for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }
}