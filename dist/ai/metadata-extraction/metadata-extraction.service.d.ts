import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AiGeneratedImage } from '../entities/image-generation.entity';
import { ExtractMetadataDto } from '../dto/chat.dto';
import { ExtractedMetadata } from '../interfaces/metadata.interface';
export declare class MetadataExtractionService {
    private configService;
    private imageRepository;
    private readonly logger;
    constructor(configService: ConfigService, imageRepository: Repository<AiGeneratedImage>);
    extractMetadata(dto: ExtractMetadataDto): Promise<ExtractedMetadata>;
    private extractMetadataFromImage;
}
