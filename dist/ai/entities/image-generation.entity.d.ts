import { BaseEntity } from '../../common/entities/base.entity';
import { AiChatMessage } from './chat.entity';
export declare class AiGeneratedImage extends BaseEntity {
    imageUrl: string;
    thumbnailUrl: string;
    generationParams: Record<string, any>;
    metadata: Record<string, any>;
    message: AiChatMessage;
    messageId: string;
    isSelected: boolean;
}
