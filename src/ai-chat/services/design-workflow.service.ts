import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { OpenAIService } from './openai.service';
import { NFTService } from '../../web3/services/nft.service';
import { JobService } from '../../marketplace/services/job.service';
import { CreateDesignDto, ApproveDesignDto, SimpleApproveDesignDto } from '../dto/design.dto';
import { ChatState } from '../entities/chat.entity';
import { NFTStatus } from '../../web3/entities/nft.entity';
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

      // Centralized guard: prevent duplicate/concurrent generations
      const existingChat = dto as any;
      const chatIdFromDto = existingChat.chatId as string | undefined;
      let chatForGuards = chatIdFromDto ? await this.chatService.getChat(userId, chatIdFromDto).catch(() => null) : null;
      if (chatForGuards?.metadata?.generating) {
        this.logger.log(`Skip generate: already generating for chat ${chatIdFromDto}`);
        return { chat: chatForGuards, designImages: chatForGuards?.designPreviews || [] };
      }
      if (chatForGuards && Array.isArray(chatForGuards.designPreviews) && chatForGuards.designPreviews.length >= 3) {
        const lastDone = chatForGuards.metadata?.lastGenerationCompletedAt ? new Date(chatForGuards.metadata.lastGenerationCompletedAt).getTime() : 0;
        const recent = lastDone && (Date.now() - lastDone < 2 * 60 * 1000);
        if (recent) {
          this.logger.log(`Skip generate: 3 previews exist recently for chat ${chatIdFromDto}`);
          return { chat: chatForGuards, designImages: chatForGuards.designPreviews };
        }
      }
      if (chatForGuards) {
        await this.chatService.updateChat(chatForGuards.id, { metadata: { ...chatForGuards.metadata, generating: true } });
      }

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
      
      // AI automatically analyzes the prompt to suggest smart defaults (kept for legacy)
      const metadata = await this.generateSmartDesignMetadata(dto.prompt);
      
      const chat = chatForGuards || await this.chatService.createChat(userId, {
        title: `Design: ${dto.prompt.substring(0, 50)}...`,
      });
      
      chat.designPreviews = designImages;
      chat.state = ChatState.DESIGN_PREVIEW;
      
      // Do NOT create NFT or job yet; wait for explicit approval with user-provided details
      let nft = undefined, job = undefined;
      
      const designsText = designImages.map((url, index) => `Design ${index + 1}: ${url}`).join('\n');
      
      const aiGeneratedDetails = `Here are your ${successCount} design options:\n\n${designsText}\n\nWhich one do you like best? You can also request tweaks or new variations until you're satisfied.`;

      await this.chatService.sendMessage(userId, { chatId: chat.id, content: aiGeneratedDetails });
      await this.chatService.updateChat(chat.id, { metadata: { ...chat.metadata, generating: false, lastGenerationCompletedAt: new Date().toISOString() } });
      
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

  async approveDesign(userId: string, dto: ApproveDesignDto): Promise<{ nft: any; message: string }> {
    try {
      this.logger.log(`Processing design approval: ${dto.designName}`);
      
      // Get the chat to find the design previews
      const chat = await this.chatService.getChat(userId, dto.chatId);
      if (!chat || !chat.designPreviews || chat.designPreviews.length === 0) {
        throw new Error('No design previews found for this chat');
      }
      
      // Get the selected variation image
      const variationIndex = parseInt(dto.selectedVariety.split('_')[1]) - 1;
      const selectedImageUrl = chat.designPreviews[variationIndex];
      
      if (!selectedImageUrl) {
        throw new Error('Selected design variation not found');
      }
      
      // Create or update the NFT with approved details
      let nft;
      if (chat.nftId) {
        // Update existing NFT
        nft = await this.nftService.updateNFT(chat.nftId, {
          name: dto.designName,
          price: dto.price,
          quantity: dto.collectionQuantity,
          deadline: dto.deadline,
          description: dto.description || `Custom design: ${dto.designName}`,
          imageUrl: selectedImageUrl,
          status: NFTStatus.DRAFT, // Keep as DRAFT until minted
        });
      } else {
        // Create new NFT
        nft = await this.nftService.createNFT({
          name: dto.designName,
          description: dto.description || `Custom design: ${dto.designName}`,
          category: 'Custom Design',
          price: dto.price,
          quantity: dto.collectionQuantity,
          imageUrl: selectedImageUrl,
          creatorId: userId,
          chatId: dto.chatId,
        });
      }
      
      // Update chat with NFT reference
      await this.chatService.updateChat(dto.chatId, {
        nftId: nft.id,
        state: ChatState.DESIGN_APPROVED,
      });
      
      // Generate design link
      const designLink = `/designs/${nft.id}`;
      
      // Update NFT with design link
      const deadline = dto.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
      
      // Update NFT with design link
      await this.nftService.updateNFT(nft.id, {
        designLink,
        deadline,
      });
      
      this.logger.log(`Design approved and NFT created: ${nft.id}`);
      
      return {
        nft,
        message: `Design "${dto.designName}" approved! It's now in DRAFT status. You can either:
1. Publish to Market (will trigger minting)
2. Hire a Maker (will trigger minting if in DRAFT status)`
      };
    } catch (error) {
      this.logger.error(`Design approval error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Simple approval that uses AI suggestions - minimal user input required
   */
  async simpleApproveDesign(userId: string, dto: SimpleApproveDesignDto): Promise<{ nft: any; message: string }> {
    try {
      this.logger.log(`Processing simple design approval for chat: ${dto.chatId}`);
      
      // Get the chat to find the design previews and metadata
      const chat = await this.chatService.getChat(userId, dto.chatId);
      if (!chat || !chat.designPreviews || chat.designPreviews.length === 0) {
        throw new Error('No design previews found for this chat');
      }
      
      // Get the selected variation image
      const variationIndex = parseInt(dto.selectedVariety.split('_')[1]) - 1;
      const selectedImageUrl = chat.designPreviews[variationIndex];
      
      if (!selectedImageUrl) {
        throw new Error('Selected design variation not found');
      }
      
      // Get the original prompt to regenerate metadata if needed
      const originalPrompt = chat.messages?.[0]?.content || 'Custom design';
      
      // Use AI suggestions or regenerate if needed
      const metadata = dto.useAISuggestions ? 
        await this.generateSmartDesignMetadata(originalPrompt) : 
        this.getFallbackMetadata(originalPrompt);
      
      // Override name if user provided custom name
      const finalName = dto.customName || metadata.suggestedName;
      
      // Create NFT with AI-generated details
      const nft = await this.nftService.createNFT({
        name: finalName,
        description: originalPrompt,
        category: metadata.category,
        price: metadata.suggestedPrice,
        quantity: metadata.suggestedQuantity,
        imageUrl: selectedImageUrl,
        creatorId: userId,
        chatId: dto.chatId,
      });
      
      // Update chat with NFT reference
      await this.chatService.updateChat(dto.chatId, {
        nftId: nft.id,
        state: ChatState.DESIGN_APPROVED,
      });
      
      // Generate design link and set deadline
      const designLink = `/designs/${nft.id}`;
      const deadline = new Date(Date.now() + metadata.suggestedTimeframe * 24 * 60 * 60 * 1000);
      
      // Update NFT with additional details
      await this.nftService.updateNFT(nft.id, {
        designLink,
        deadline,
      });
      
      this.logger.log(`Design approved with AI suggestions: ${nft.id}`);
      
      return {
        nft,
        message: `🎉 **Design "${finalName}" approved with AI suggestions!**
        
📊 **AI Generated Details:**
• **Price:** $${metadata.suggestedPrice}
• **Quantity:** ${metadata.suggestedQuantity} pieces
• **Timeline:** ${metadata.suggestedTimeframe} days
• **Category:** ${metadata.category}
• **Style:** ${metadata.style}

🚀 **Next Steps:**
1. **Publish to Market** (triggers minting)
2. **Hire a Maker** (triggers minting if needed)

Your design is now in DRAFT status and ready for the next step!`
      };
    } catch (error) {
      this.logger.error(`Simple design approval error: ${error.message}`, error.stack);
      throw error;
    }
    }

  async payForDesign(userId: string, chatId: string, paymentTransactionHash: string): Promise<any> {
    try {
      this.logger.log(`Processing payment for design in chat: ${chatId}`);
      
      // Get the chat to find the NFT
      const chat = await this.chatService.getChat(userId, chatId);
      if (!chat.nftId) {
        throw new Error('No design found in this chat');
      }

      // Get the NFT
      const nft = await this.nftService.findById(chat.nftId);
      if (!nft || nft.creatorId !== userId) {
        throw new Error('Design not found or does not belong to you');
      }

      // Verify payment (you may want to add actual payment verification logic here)
      if (!paymentTransactionHash) {
        throw new Error('Payment transaction hash is required');
      }

      // Update NFT status to PUBLISHED (meaning it's now in user's "My Designs")
      const updatedMetadata = {
        ...nft.metadata,
        paymentTransactionHash,
        paidAt: new Date().toISOString(),
        status: 'owned'
      };
      
      await this.nftService.updateNFT(nft.id, {
        status: 'PUBLISHED' as any,
        metadata: updatedMetadata
      });

      this.logger.log(`Design payment completed for NFT: ${nft.id}`);
      
      return {
        nft: await this.nftService.findById(nft.id),
        message: 'Payment successful! Design added to My Designs.',
        status: 'owned',
        nextSteps: [
          'Hire a Maker (will mint to marketplace)',
          'View in My Designs collection'
        ]
      };
    } catch (error) {
      this.logger.error(`Design payment error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async mintAndPublishDesign(userId: string, nftId: string, transactionHash: string): Promise<any> {
    try {
      this.logger.log(`Minting and publishing design: ${nftId}`);
      
      // Get the NFT
      const nft = await this.nftService.findById(nftId);
      if (!nft || nft.creatorId !== userId) {
        throw new Error('NFT not found or does not belong to you');
      }
      
      if (nft.status !== NFTStatus.DRAFT) {
        throw new Error('Only draft NFTs can be minted and published');
      }
      
      // Mint the NFT
      const mintedNFT = await this.nftService.mintNFT({
        nftId,
        recipientAddress: undefined // Mint to creator
      });
      
      // Update status to PUBLISHED (not just MINTED)
      const publishedNFT = await this.nftService.updateNFT(nftId, {
        status: NFTStatus.PUBLISHED
      });
      
      this.logger.log(`Design minted and published: ${nftId}`);
      
      return publishedNFT;
    } catch (error) {
      this.logger.error(`Mint and publish error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * AI automatically analyzes the design prompt to generate smart defaults
   * This eliminates the need for users to manually input most details
   */
  private async generateSmartDesignMetadata(prompt: string): Promise<any> {
    try {
      // For now, use smart defaults based on prompt analysis
      // In the future, this could call OpenAI to analyze the prompt
      return this.getSmartDefaultsFromPrompt(prompt);
    } catch (error) {
      this.logger.error(`Failed to generate smart metadata: ${error.message}`);
      // Fallback to basic defaults if AI analysis fails
      return this.getFallbackMetadata(prompt);
    }
  }

  /**
   * Smart defaults generation based on prompt analysis
   */
  private getSmartDefaultsFromPrompt(prompt: string): any {
    const lowerPrompt = prompt.toLowerCase();
    
    return {
      suggestedName: this.generateNameFromPrompt(prompt),
      category: this.detectCategoryFromPrompt(prompt),
      suggestedPrice: this.calculateSmartPrice(lowerPrompt),
      suggestedTimeframe: this.calculateSmartTimeline(lowerPrompt),
      colors: this.extractColorsFromPrompt(prompt),
      materials: this.extractMaterialsFromPrompt(prompt),
      style: this.detectStyleFromPrompt(prompt),
      suggestedQuantity: this.calculateSmartQuantity(lowerPrompt)
    };
  }

  /**
   * Fallback metadata generation when AI analysis fails
   */
  private getFallbackMetadata(prompt: string): any {
    return {
      suggestedName: this.generateNameFromPrompt(prompt),
      category: 'Custom Design',
      suggestedPrice: 150,
      suggestedTimeframe: 7,
      colors: ['white'],
      materials: ['fabric'],
      style: 'custom',
      suggestedQuantity: 5
    };
  }

  /**
   * Smart helper methods for metadata generation
   */
  private generateNameFromPrompt(prompt: string): string {
    const words = prompt.split(' ').filter(word => word.length > 3);
    const keyWords = words.slice(0, 3).map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return keyWords.join(' ') + ' Design';
  }

  private detectCategoryFromPrompt(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('dress')) return 'Dress';
    if (lowerPrompt.includes('shirt') || lowerPrompt.includes('top')) return 'Top';
    if (lowerPrompt.includes('pants') || lowerPrompt.includes('trousers')) return 'Pants';
    if (lowerPrompt.includes('jacket') || lowerPrompt.includes('coat')) return 'Outerwear';
    if (lowerPrompt.includes('skirt')) return 'Skirt';
    if (lowerPrompt.includes('suit')) return 'Suit';
    return 'Custom Design';
  }

  private calculateSmartPrice(prompt: string): number {
    let basePrice = 100;
    
    // Adjust for complexity indicators
    if (prompt.includes('simple') || prompt.includes('basic')) basePrice = 80;
    else if (prompt.includes('complex') || prompt.includes('detailed')) basePrice = 200;
    else if (prompt.includes('luxury') || prompt.includes('premium')) basePrice = 300;
    
    // Adjust for materials
    if (prompt.includes('silk')) basePrice += 50;
    if (prompt.includes('leather')) basePrice += 80;
    if (prompt.includes('denim')) basePrice += 20;
    if (prompt.includes('cotton')) basePrice += 10;
    
    return Math.round(basePrice / 10) * 10; // Round to nearest 10
  }

  private calculateSmartTimeline(prompt: string): number {
    if (prompt.includes('simple') || prompt.includes('basic')) return 5;
    if (prompt.includes('complex') || prompt.includes('detailed')) return 10;
    if (prompt.includes('luxury') || prompt.includes('premium')) return 14;
    return 7; // Default medium complexity
  }

  private calculateSmartQuantity(prompt: string): number {
    if (prompt.includes('simple') || prompt.includes('basic')) return 8;
    if (prompt.includes('complex') || prompt.includes('detailed')) return 3;
    if (prompt.includes('luxury') || prompt.includes('premium')) return 2;
    return 5; // Default medium complexity
  }

  private extractColorsFromPrompt(prompt: string): string[] {
    const colorKeywords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'purple', 'orange', 'brown', 'gray', 'navy', 'beige', 'cream'];
    const lowerPrompt = prompt.toLowerCase();
    return colorKeywords.filter(color => lowerPrompt.includes(color));
  }

  private extractMaterialsFromPrompt(prompt: string): string[] {
    const materialKeywords = ['cotton', 'silk', 'denim', 'leather', 'wool', 'linen', 'polyester', 'satin', 'lace', 'velvet', 'chiffon'];
    const lowerPrompt = prompt.toLowerCase();
    return materialKeywords.filter(material => lowerPrompt.includes(material));
  }

  private detectStyleFromPrompt(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('casual')) return 'casual';
    if (lowerPrompt.includes('formal') || lowerPrompt.includes('elegant')) return 'formal';
    if (lowerPrompt.includes('vintage')) return 'vintage';
    if (lowerPrompt.includes('modern') || lowerPrompt.includes('contemporary')) return 'modern';
    if (lowerPrompt.includes('bohemian') || lowerPrompt.includes('boho')) return 'bohemian';
    return 'custom';
  }
}