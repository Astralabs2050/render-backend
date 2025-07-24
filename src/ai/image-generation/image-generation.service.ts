import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AiGeneratedImage } from '../entities/image-generation.entity';
import { AiChatMessage } from '../entities/chat.entity';
import { GenerateImageDto } from '../dto/chat.dto';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly uploadDir: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AiGeneratedImage)
    private imageRepository: Repository<AiGeneratedImage>,
    @InjectRepository(AiChatMessage)
    private messageRepository: Repository<AiChatMessage>,
  ) {
    // Create uploads directory if it doesn't exist
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async generateImages(dto: GenerateImageDto): Promise<AiGeneratedImage[]> {
    try {
      const { prompt, chatId, messageId, referenceImageBase64, provider } = dto;

      // Find the message
      const message = await this.messageRepository.findOne({
        where: { id: messageId, chatId },
      });

      if (!message) {
        throw new BadRequestException('Message not found');
      }

      // Generate images based on provider
      let imageUrls: string[];
      if (provider === 'astria') {
        imageUrls = await this.generateWithAstria(prompt, referenceImageBase64);
      } else {
        imageUrls = await this.generateWithStableDiffusion(prompt, referenceImageBase64);
      }

      // Save images to database
      const generatedImages = await Promise.all(
        imageUrls.map(async (imageUrl) => {
          const image = this.imageRepository.create({
            imageUrl,
            messageId,
            generationParams: {
              prompt,
              provider,
              hasReferenceImage: !!referenceImageBase64,
            },
          });
          return this.imageRepository.save(image);
        }),
      );

      // Update message with first image
      if (generatedImages.length > 0) {
        message.imageUrl = generatedImages[0].imageUrl;
        await this.messageRepository.save(message);
      }

      return generatedImages;
    } catch (error) {
      this.logger.error(`Error generating images: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate images');
    }
  }

  private async generateWithStableDiffusion(
    prompt: string,
    referenceImageBase64?: string,
  ): Promise<string[]> {
    try {
      // Mock implementation - replace with actual API call
      this.logger.log(`Generating images with Stable Diffusion: ${prompt}`);
      
      // In a real implementation, call the Stable Diffusion API
      // const response = await axios.post('https://api.stability.ai/v1/generation', {
      //   prompt,
      //   referenceImage: referenceImageBase64,
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${this.configService.get('STABILITY_API_KEY')}`,
      //   },
      // });
      
      // For now, simulate by saving placeholder images
      const images = await Promise.all([
        this.saveBase64AsImage('mock-data', 'image1'),
        this.saveBase64AsImage('mock-data', 'image2'),
        this.saveBase64AsImage('mock-data', 'image3'),
      ]);
      
      return images;
    } catch (error) {
      this.logger.error(`Stable Diffusion API error: ${error.message}`);
      throw error;
    }
  }

  private async generateWithAstria(
    prompt: string,
    referenceImageBase64?: string,
  ): Promise<string[]> {
    try {
      // Mock implementation - replace with actual API call
      this.logger.log(`Generating images with Astria: ${prompt}`);
      
      // In a real implementation, call the Astria API
      // const response = await axios.post('https://api.astria.ai/generations', {
      //   prompt,
      //   referenceImage: referenceImageBase64,
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${this.configService.get('ASTRIA_API_KEY')}`,
      //   },
      // });
      
      // For now, simulate by saving placeholder images
      const images = await Promise.all([
        this.saveBase64AsImage('mock-data', 'astria1'),
        this.saveBase64AsImage('mock-data', 'astria2'),
      ]);
      
      return images;
    } catch (error) {
      this.logger.error(`Astria API error: ${error.message}`);
      throw error;
    }
  }

  private async saveBase64AsImage(
    base64Data: string,
    prefix: string,
  ): Promise<string> {
    // Generate a unique filename
    const filename = `${prefix}-${crypto.randomUUID()}.png`;
    const filepath = path.join(this.uploadDir, filename);
    
    // In a real implementation, decode and save the base64 image
    // const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    // fs.writeFileSync(filepath, buffer);
    
    // For mock purposes, create an empty file
    fs.writeFileSync(filepath, 'mock image data');
    
    // Return the URL path
    return `/uploads/${filename}`;
  }
}