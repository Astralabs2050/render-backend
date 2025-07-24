import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AiGeneratedImage } from '../entities/image-generation.entity';
import { AiChatMessage } from '../entities/chat.entity';
import { GenerateImageDto } from '../dto/chat.dto';
export declare class ImageGenerationService {
    private configService;
    private imageRepository;
    private messageRepository;
    private readonly logger;
    private readonly uploadDir;
    constructor(configService: ConfigService, imageRepository: Repository<AiGeneratedImage>, messageRepository: Repository<AiChatMessage>);
    generateImages(dto: GenerateImageDto): Promise<AiGeneratedImage[]>;
    private generateWithStableDiffusion;
    private generateWithAstria;
    private saveBase64AsImage;
}
