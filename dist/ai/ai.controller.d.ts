import { ChatService } from './chat/chat.service';
import { ImageGenerationService } from './image-generation/image-generation.service';
import { MetadataExtractionService } from './metadata-extraction/metadata-extraction.service';
import { CreateChatDto, SendMessageDto, GenerateImageDto, ExtractMetadataDto } from './dto/chat.dto';
import { ExtractedMetadata } from './interfaces/metadata.interface';
export declare class AiController {
    private readonly chatService;
    private readonly imageGenerationService;
    private readonly metadataExtractionService;
    constructor(chatService: ChatService, imageGenerationService: ImageGenerationService, metadataExtractionService: MetadataExtractionService);
    createChat(req: any, dto: CreateChatDto): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/chat.entity").AiChat;
    }>;
    getChats(req: any): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/chat.entity").AiChat[];
    }>;
    getChat(req: any, chatId: string): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/chat.entity").AiChat;
    }>;
    sendMessage(req: any, dto: SendMessageDto): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/chat.entity").AiChatMessage;
    }>;
    generateImages(dto: GenerateImageDto): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/image-generation.entity").AiGeneratedImage[];
    }>;
    extractMetadata(dto: ExtractMetadataDto): Promise<{
        status: boolean;
        message: string;
        data: ExtractedMetadata;
    }>;
}
