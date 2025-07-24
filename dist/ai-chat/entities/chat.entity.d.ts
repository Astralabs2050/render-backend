import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
export declare enum UserType {
    CREATOR = "creator",
    MAKER = "maker"
}
export declare enum ChatState {
    WELCOME = "welcome",
    INTENT = "intent",
    INFO_GATHER = "info_gather",
    DESIGN_PREVIEW = "design_preview",
    LISTED = "listed",
    MAKER_PROPOSAL = "maker_proposal",
    ESCROW_PAYMENT = "escrow_payment",
    FABRIC_SHIPPING = "fabric_shipping",
    SAMPLE_REVIEW = "sample_review",
    FINAL_REVIEW = "final_review",
    DELIVERY = "delivery",
    COMPLETED = "completed"
}
export declare class Chat extends BaseEntity {
    title: string;
    state: ChatState;
    metadata: Record<string, any>;
    user: User;
    userId: string;
    creator: User;
    creatorId: string;
    maker: User;
    makerId: string;
    messages: ChatMessage[];
    designImageUrl: string;
    jobId: string;
    escrowId: string;
}
export declare class ChatMessage extends BaseEntity {
    content: string;
    role: 'user' | 'assistant' | 'system';
    metadata: Record<string, any>;
    chat: Chat;
    chatId: string;
    imageUrl: string;
    actionType: string;
}
