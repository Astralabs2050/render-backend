import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../ai-chat/entities/chat.entity';
import { NFT } from './nft.entity';
export declare enum EscrowStatus {
    CREATED = "created",
    FUNDED = "funded",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    DISPUTED = "disputed",
    CANCELLED = "cancelled"
}
export declare enum MilestoneStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    APPROVED = "approved",
    DISPUTED = "disputed"
}
export declare class EscrowContract extends BaseEntity {
    contractAddress: string;
    totalAmount: number;
    status: EscrowStatus;
    creator: User;
    creatorId: string;
    maker: User;
    makerId: string;
    nft: NFT;
    nftId: string;
    chat: Chat;
    chatId: string;
    milestones: EscrowMilestone[];
    transactionHash: string;
    fundedAt: Date;
    completedAt: Date;
}
export declare class EscrowMilestone extends BaseEntity {
    name: string;
    description: string;
    percentage: number;
    amount: number;
    order: number;
    status: MilestoneStatus;
    escrow: EscrowContract;
    escrowId: string;
    dueDate: Date;
    completedAt: Date;
    approvedAt: Date;
    transactionHash: string;
    metadata: Record<string, any>;
}
