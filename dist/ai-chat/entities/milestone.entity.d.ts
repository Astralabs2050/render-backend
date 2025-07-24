import { BaseEntity } from '../../common/entities/base.entity';
import { Chat } from './chat.entity';
export declare enum MilestoneStatus {
    PENDING = "pending",
    UNLOCKED = "unlocked",
    COMPLETED = "completed"
}
export declare class Milestone extends BaseEntity {
    name: string;
    description: string;
    amount: number;
    percentage: number;
    status: MilestoneStatus;
    completedAt: Date;
    dueDate: Date;
    chat: Chat;
    chatId: string;
    order: number;
}
