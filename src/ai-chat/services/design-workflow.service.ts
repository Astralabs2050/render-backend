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
  async processDesignRequest(userId: string, dto: CreateDesignDto) {
    try {
      this.logger.log(`Processing design request: ${dto.prompt}`);
      const designImages = [];
      try {
        const imageUrl = await this.openaiService.generateDesignImage(dto.prompt, dto.fabricImageBase64);
        designImages.push(imageUrl);
        this.logger.log(`Generated design: ${imageUrl}`);
      } catch (error) {
        this.logger.error(`Failed to generate design image: ${error.message}`);
        designImages.push('https://via.placeholder.com/400x400?text=Design+Error');
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
      const nft = await this.nftService.createNFT({
        name: metadata.suggestedName,
        description: dto.prompt,
        category: metadata.category,
        price: metadata.suggestedPrice,
        quantity: 1,
        imageUrl: designImages[0],
        creatorId: userId,
      });
      const mintedNFT = nft;
      const job = await this.jobService.createJob({
        title: metadata.suggestedName,
        description: dto.prompt,
        budget: metadata.suggestedPrice,
        deadline: new Date(Date.now() + metadata.suggestedTimeframe * 24 * 60 * 60 * 1000).toISOString(),
        referenceImages: designImages,
        chatId: chat.id,
      }, userId);
      await this.chatService.sendMessage(userId, {
        chatId: chat.id,
        content: `Your design "${metadata.suggestedName}" has been created and listed! We'll notify you when a Maker applies.`,
      });
      return {
        chat,
        designImages,
        metadata,
        nft: mintedNFT,
        job,
      };
    } catch (error) {
      this.logger.error(`Design workflow error: ${error.message}`, error.stack);
      throw error;
    }
  }
}