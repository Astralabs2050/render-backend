import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
export declare class AiChat extends BaseEntity {
    title: string;
    user: User;
    userId: string;
    messages: AiChatMessage[];
}
export declare class AiChatMessage extends BaseEntity {
    content: string;
    role: 'user' | 'assistant';
    metadata: Record<string, any>;
    chat: AiChat;
    chatId: string;
    imageUrl: string;
}
