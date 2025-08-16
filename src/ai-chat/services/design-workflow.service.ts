import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { OpenAIService } from './openai.service';
import { NFTService } from '../../web3/services/nft.service';
import { JobService } from '../../marketplace/services/job.service';
import { CreateDesignDto } from '../dto/design.dto';
import { ChatState } from '../entities/chat.entity';
@Injectable()
export class DesignWorkflowService {
  private readonly logger = new Logger(DesignWorkflowService.name);
  constructor(
    private readonly chatService: ChatService,
    private readonly openaiService: OpenAIService,
    private readonly nftService: NFTService,
    private readonly jobService: JobService,
  ) {}
  async processDesignVariation(userId: string, chatId: string, prompt: string) {
    try {
      this.logger.log(`Processing design variation for chat ${chatId}: ${prompt}`);
      
      // Validate chat exists and user has access
      const chat = await this.chatService.getChat(userId, chatId);
      if (!chat) {
        throw new Error('Chat not found or access denied');
      }
      
      const designImages = [];
      let successCount = 0;
      
      for (let i = 0; i < 3; i++) {
        try {
          const imageUrl = await this.openaiService.generateDesignImage(prompt);
          designImages.push(imageUrl);
          successCount++;
          this.logger.log(`Generated design variation ${i + 1}: ${imageUrl}`);
        } catch (error) {
          this.logger.error(`Failed to generate design variation ${i + 1}: ${error.message}`);
          designImages.push('https://via.placeholder.com/400x400?text=Design+Error');
        }
      }
      
      // If all generations failed, throw error
      if (successCount === 0) {
        throw new Error('Failed to generate any design variations');
      }

      chat.designPreviews = designImages;
      
      const variationsText = designImages.map((url, index) => `Variation ${index + 1}: ${url}`).join('\n');
      
      await this.chatService.sendMessage(userId, {
        chatId: chat.id,
        content: `Here are your ${successCount} design variations:\n\n${variationsText}\n\nWould you like to make any other changes or proceed with one of these designs?`,
      });

      return {
        chat,
        designImages,
        designUrls: designImages,
        successCount,
      };
    } catch (error) {
      this.logger.error(`Design variation workflow error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processDesignRequest(userId: string, dto: CreateDesignDto) {
    try {
      this.logger.log(`Processing design request: ${dto.prompt}`);
      
      // Generate 3 design variations
      const designImages = [];
      let successCount = 0;
      
      for (let i = 0; i < 3; i++) {
        try {
          const imageUrl = await this.openaiService.generateDesignImage(dto.prompt, dto.fabricImageBase64);
          designImages.push(imageUrl);
          successCount++;
          this.logger.log(`Generated design ${i + 1}: ${imageUrl}`);
        } catch (error) {
          this.logger.error(`Failed to generate design image ${i + 1}: ${error.message}`);
          designImages.push('https://via.placeholder.com/400x400?text=Design+Error');
        }
      }
      
      // If all generations failed, throw error
      if (successCount === 0) {
        throw new Error('Failed to generate any design images');
      }
      
      const metadata = {
        suggestedName: 'Custom Design',
        category: 'Dress',
        suggestedPrice: 150,
        suggestedTimeframe: 7,
        colors: ['white'],
        materials: ['fabric'],
        style: 'custom',
      };
      
      const chat = await this.chatService.createChat(userId, {
        title: `Design: ${metadata.suggestedName || dto.prompt.substring(0, 50)}...`,
      });
      
      chat.designPreviews = designImages;
      chat.state = ChatState.DESIGN_PREVIEW;
      
      // Only create NFT and job if we have at least one successful design
      let nft, job;
      try {
        nft = await this.nftService.createNFT({
          name: metadata.suggestedName,
          description: dto.prompt,
          category: metadata.category,
          price: metadata.suggestedPrice,
          quantity: 1,
          imageUrl: designImages[0],
          creatorId: userId,
        });
        
        job = await this.jobService.createJob({
          title: metadata.suggestedName,
          description: dto.prompt,
          budget: metadata.suggestedPrice,
          deadline: new Date(Date.now() + metadata.suggestedTimeframe * 24 * 60 * 60 * 1000).toISOString(),
          referenceImages: designImages.filter(img => !img.includes('placeholder')),
          chatId: chat.id,
        }, userId);
      } catch (error) {
        this.logger.error(`Failed to create NFT or job: ${error.message}`);
        // Continue without NFT/job creation
      }
      
      const designsText = designImages.map((url, index) => `Design ${index + 1}: ${url}`).join('\n');
      
      await this.chatService.sendMessage(userId, {
        chatId: chat.id,
        content: `Here are your ${successCount} design options:\n\n${designsText}\n\nYour design "${metadata.suggestedName}" has been created and listed! We'll notify you when a Maker applies.`,
      });
      
      return {
        chat,
        designImages,
        designUrl: designImages[0],
        metadata,
        nft,
        job,
        successCount,
      };
    } catch (error) {
      this.logger.error(`Design workflow error: ${error.message}`, error.stack);
      throw error;
    }
  }
}