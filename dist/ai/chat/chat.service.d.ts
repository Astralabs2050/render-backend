import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiChat, AiChatMessage } from '../entities/chat.entity';
import { CreateChatDto, SendMessageDto } from '../dto/chat.dto';
import { ImageGenerationService } from '../image-generation/image-generation.service';
export declare class ChatService {
    private chatRepository;
    private messageRepository;
    private configService;
    private imageGenerationService;
    private readonly logger;
    constructor(chatRepository: Repository<AiChat>, messageRepository: Repository<AiChatMessage>, configService: ConfigService, imageGenerationService: ImageGenerationService);
    createChat(userId: string, dto: CreateChatDto): Promise<AiChat>;
    getChats(userId: string): Promise<AiChat[]>;
    getChat(userId: string, chatId: string): Promise<AiChat>;
    sendMessage(userId: string, dto: SendMessageDto): Promise<AiChatMessage>;
    private generateAiResponse;
    private isOutfitGenerationRequest;
}
