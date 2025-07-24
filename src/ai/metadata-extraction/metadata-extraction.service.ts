import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AiGeneratedImage } from '../entities/image-generation.entity';
import { ExtractMetadataDto } from '../dto/chat.dto';
import { ExtractedMetadata } from '../interfaces/metadata.interface';

@Injectable()
export class MetadataExtractionService {
  private readonly logger = new Logger(MetadataExtractionService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(AiGeneratedImage)
    private imageRepository: Repository<AiGeneratedImage>,
  ) {}

  async extractMetadata(dto: ExtractMetadataDto): Promise<ExtractedMetadata> {
    try {
      const { imageId } = dto;

      // Find the image
      const image = await this.imageRepository.findOne({
        where: { id: imageId },
      });

      if (!image) {
        throw new NotFoundException('Image not found');
      }

      // In a real implementation, call an AI service to extract metadata
      // For now, use a mock implementation
      const metadata = await this.extractMetadataFromImage(image.imageUrl);

      // Save metadata to the image
      image.metadata = metadata;
      await this.imageRepository.save(image);

      return metadata;
    } catch (error) {
      this.logger.error(`Error extracting metadata: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async extractMetadataFromImage(imageUrl: string): Promise<ExtractedMetadata> {
    try {
      // Mock implementation - replace with actual API call
      this.logger.log(`Extracting metadata from image: ${imageUrl}`);
      
      // In a real implementation, call an AI service like OpenAI's GPT-4 Vision
      // const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      //   model: 'gpt-4-vision-preview',
      //   messages: [
      //     {
      //       role: 'user',
      //       content: [
      //         { type: 'text', text: 'Extract product metadata from this fashion image' },
      //         { type: 'image_url', image_url: { url: imageUrl } }
      //       ]
      //     }
      //   ],
      //   max_tokens: 300,
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${this.configService.get('OPENAI_API_KEY')}`,
      //   },
      // });
      
      // For now, return mock data
      return {
        name: 'White Satin Evening Gown',
        category: 'Dresses',
        deliveryTimeline: '3-4 weeks',
        suggestedPrice: 299.99,
        colors: ['white', 'ivory'],
        description: 'Elegant white satin dress with cutouts and a flowing train. Perfect for formal events and weddings.',
      };
    } catch (error) {
      this.logger.error(`Metadata extraction API error: ${error.message}`);
      throw error;
    }
  }
}