import { Repository } from 'typeorm';
import { EscrowContract, EscrowMilestone } from '../entities/escrow.entity';
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
export declare class EscrowService {
    private escrowRepository;
    private milestoneRepository;
    private thirdwebService;
    private configService;
    private readonly logger;
    private readonly escrowContractAddress;
    constructor(escrowRepository: Repository<EscrowContract>, milestoneRepository: Repository<EscrowMilestone>, thirdwebService: ThirdwebService, configService: ConfigService);
    createEscrow(dto: CreateEscrowDto): Promise<EscrowContract>;
    fundEscrow(dto: FundEscrowDto): Promise<EscrowContract>;
    completeMilestone(milestoneId: string): Promise<EscrowMilestone>;
    approveMilestone(dto: ReleaseMilestoneDto): Promise<EscrowMilestone>;
    disputeMilestone(milestoneId: string, reason: string): Promise<EscrowMilestone>;
    findById(id: string): Promise<EscrowContract>;
    findByCreator(creatorId: string): Promise<EscrowContract[]>;
    findByMaker(makerId: string): Promise<EscrowContract[]>;
    findByChat(chatId: string): Promise<EscrowContract[]>;
    getEscrowStats(escrowId: string): Promise<{
        totalMilestones: number;
        completedMilestones: number;
        approvedMilestones: number;
        releasedAmount: number;
        remainingAmount: number;
        progressPercentage: number;
    }>;
    private startNextMilestone;
    private checkEscrowCompletion;
    private deployEscrowContract;
    cancelEscrow(escrowId: string, reason: string): Promise<EscrowContract>;
}
