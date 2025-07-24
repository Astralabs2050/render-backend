"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EscrowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const escrow_entity_1 = require("../entities/escrow.entity");
const thirdweb_service_1 = require("./thirdweb.service");
const config_1 = require("@nestjs/config");
let EscrowService = EscrowService_1 = class EscrowService {
    constructor(escrowRepository, milestoneRepository, thirdwebService, configService) {
        this.escrowRepository = escrowRepository;
        this.milestoneRepository = milestoneRepository;
        this.thirdwebService = thirdwebService;
        this.configService = configService;
        this.logger = new common_1.Logger(EscrowService_1.name);
        this.escrowContractAddress = this.configService.get('ESCROW_CONTRACT_ADDRESS');
    }
    async createEscrow(dto) {
        try {
            const contractAddress = this.escrowContractAddress || await this.deployEscrowContract();
            const escrow = this.escrowRepository.create({
                contractAddress,
                totalAmount: dto.totalAmount,
                creatorId: dto.creatorId,
                makerId: dto.makerId,
                nftId: dto.nftId,
                chatId: dto.chatId,
                status: escrow_entity_1.EscrowStatus.CREATED,
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
                    status: escrow_entity_1.MilestoneStatus.PENDING,
                });
            });
            await this.milestoneRepository.save(milestones);
            const escrowWithMilestones = await this.findById(savedEscrow.id);
            this.logger.log(`Escrow created: ${savedEscrow.id} - ${dto.totalAmount} total`);
            return escrowWithMilestones;
        }
        catch (error) {
            this.logger.error(`Failed to create escrow: ${error.message}`);
            throw error;
        }
    }
    async fundEscrow(dto) {
        try {
            const escrow = await this.findById(dto.escrowId);
            if (escrow.status !== escrow_entity_1.EscrowStatus.CREATED) {
                throw new Error('Escrow is not in created status');
            }
            escrow.status = escrow_entity_1.EscrowStatus.FUNDED;
            escrow.transactionHash = dto.transactionHash;
            escrow.fundedAt = new Date();
            const firstMilestone = escrow.milestones.find(m => m.order === 0);
            if (firstMilestone) {
                firstMilestone.status = escrow_entity_1.MilestoneStatus.IN_PROGRESS;
                await this.milestoneRepository.save(firstMilestone);
            }
            const fundedEscrow = await this.escrowRepository.save(escrow);
            this.logger.log(`Escrow funded: ${dto.escrowId} - ${dto.transactionHash}`);
            return fundedEscrow;
        }
        catch (error) {
            this.logger.error(`Failed to fund escrow: ${error.message}`);
            throw error;
        }
    }
    async completeMilestone(milestoneId) {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId },
                relations: ['escrow'],
            });
            if (!milestone) {
                throw new common_1.NotFoundException('Milestone not found');
            }
            if (milestone.status !== escrow_entity_1.MilestoneStatus.IN_PROGRESS) {
                throw new Error('Milestone is not in progress');
            }
            milestone.status = escrow_entity_1.MilestoneStatus.COMPLETED;
            milestone.completedAt = new Date();
            const completedMilestone = await this.milestoneRepository.save(milestone);
            this.logger.log(`Milestone completed: ${milestoneId}`);
            return completedMilestone;
        }
        catch (error) {
            this.logger.error(`Failed to complete milestone: ${error.message}`);
            throw error;
        }
    }
    async approveMilestone(dto) {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: dto.milestoneId },
                relations: ['escrow'],
            });
            if (!milestone) {
                throw new common_1.NotFoundException('Milestone not found');
            }
            if (milestone.status !== escrow_entity_1.MilestoneStatus.COMPLETED) {
                throw new Error('Milestone must be completed before approval');
            }
            if (dto.transactionHash) {
                milestone.transactionHash = dto.transactionHash;
            }
            milestone.status = escrow_entity_1.MilestoneStatus.APPROVED;
            milestone.approvedAt = new Date();
            const approvedMilestone = await this.milestoneRepository.save(milestone);
            await this.startNextMilestone(milestone.escrowId, milestone.order);
            await this.checkEscrowCompletion(milestone.escrowId);
            this.logger.log(`Milestone approved: ${dto.milestoneId}`);
            return approvedMilestone;
        }
        catch (error) {
            this.logger.error(`Failed to approve milestone: ${error.message}`);
            throw error;
        }
    }
    async disputeMilestone(milestoneId, reason) {
        try {
            const milestone = await this.milestoneRepository.findOne({
                where: { id: milestoneId },
                relations: ['escrow'],
            });
            if (!milestone) {
                throw new common_1.NotFoundException('Milestone not found');
            }
            milestone.status = escrow_entity_1.MilestoneStatus.DISPUTED;
            milestone.metadata = {
                ...milestone.metadata,
                disputeReason: reason,
                disputedAt: new Date().toISOString(),
            };
            const disputedMilestone = await this.milestoneRepository.save(milestone);
            const escrow = await this.findById(milestone.escrowId);
            escrow.status = escrow_entity_1.EscrowStatus.DISPUTED;
            await this.escrowRepository.save(escrow);
            this.logger.log(`Milestone disputed: ${milestoneId} - ${reason}`);
            return disputedMilestone;
        }
        catch (error) {
            this.logger.error(`Failed to dispute milestone: ${error.message}`);
            throw error;
        }
    }
    async findById(id) {
        const escrow = await this.escrowRepository.findOne({
            where: { id },
            relations: ['creator', 'maker', 'nft', 'chat', 'milestones'],
            order: { milestones: { order: 'ASC' } },
        });
        if (!escrow) {
            throw new common_1.NotFoundException(`Escrow with ID ${id} not found`);
        }
        return escrow;
    }
    async findByCreator(creatorId) {
        return this.escrowRepository.find({
            where: { creatorId },
            order: { createdAt: 'DESC' },
            relations: ['creator', 'maker', 'nft', 'milestones'],
        });
    }
    async findByMaker(makerId) {
        return this.escrowRepository.find({
            where: { makerId },
            order: { createdAt: 'DESC' },
            relations: ['creator', 'maker', 'nft', 'milestones'],
        });
    }
    async findByChat(chatId) {
        return this.escrowRepository.find({
            where: { chatId },
            order: { createdAt: 'DESC' },
            relations: ['creator', 'maker', 'nft', 'milestones'],
        });
    }
    async getEscrowStats(escrowId) {
        const escrow = await this.findById(escrowId);
        const totalMilestones = escrow.milestones.length;
        const completedMilestones = escrow.milestones.filter(m => m.status === escrow_entity_1.MilestoneStatus.COMPLETED).length;
        const approvedMilestones = escrow.milestones.filter(m => m.status === escrow_entity_1.MilestoneStatus.APPROVED).length;
        const releasedAmount = escrow.milestones
            .filter(m => m.status === escrow_entity_1.MilestoneStatus.APPROVED)
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
    async startNextMilestone(escrowId, currentOrder) {
        const nextMilestone = await this.milestoneRepository.findOne({
            where: { escrowId, order: currentOrder + 1, status: escrow_entity_1.MilestoneStatus.PENDING },
        });
        if (nextMilestone) {
            nextMilestone.status = escrow_entity_1.MilestoneStatus.IN_PROGRESS;
            await this.milestoneRepository.save(nextMilestone);
            this.logger.log(`Next milestone started: ${nextMilestone.id}`);
        }
    }
    async checkEscrowCompletion(escrowId) {
        const escrow = await this.findById(escrowId);
        const allMilestonesApproved = escrow.milestones.every(m => m.status === escrow_entity_1.MilestoneStatus.APPROVED);
        if (allMilestonesApproved) {
            escrow.status = escrow_entity_1.EscrowStatus.COMPLETED;
            escrow.completedAt = new Date();
            await this.escrowRepository.save(escrow);
            this.logger.log(`Escrow completed: ${escrowId}`);
        }
    }
    async deployEscrowContract() {
        try {
            const contractAddress = await this.thirdwebService.deployEscrowContract();
            this.logger.log(`Escrow contract deployed: ${contractAddress}`);
            return contractAddress;
        }
        catch (error) {
            this.logger.error(`Escrow contract deployment failed: ${error.message}`);
            throw error;
        }
    }
    async cancelEscrow(escrowId, reason) {
        try {
            const escrow = await this.findById(escrowId);
            if (escrow.status === escrow_entity_1.EscrowStatus.COMPLETED) {
                throw new Error('Cannot cancel completed escrow');
            }
            escrow.status = escrow_entity_1.EscrowStatus.CANCELLED;
            for (const milestone of escrow.milestones) {
                if (milestone.status === escrow_entity_1.MilestoneStatus.PENDING || milestone.status === escrow_entity_1.MilestoneStatus.IN_PROGRESS) {
                    milestone.status = escrow_entity_1.MilestoneStatus.DISPUTED;
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
        }
        catch (error) {
            this.logger.error(`Failed to cancel escrow: ${error.message}`);
            throw error;
        }
    }
};
exports.EscrowService = EscrowService;
exports.EscrowService = EscrowService = EscrowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(escrow_entity_1.EscrowContract)),
    __param(1, (0, typeorm_1.InjectRepository)(escrow_entity_1.EscrowMilestone)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        thirdweb_service_1.ThirdwebService,
        config_1.ConfigService])
], EscrowService);
//# sourceMappingURL=escrow.service.js.map