import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DesignWorkflowService } from '../services/design-workflow.service';
import { ChatService } from '../services/chat.service';
import { CreateDesignDto, CreateDesignVariationDto, StoreDesignDto, ApproveDesignDto, SimpleApproveDesignDto } from '../dto/design.dto';
@Controller('design')
@UseGuards(JwtAuthGuard)
export class DesignController {
  constructor(
    private readonly designWorkflowService: DesignWorkflowService,
    private readonly chatService: ChatService
  ) {}
  @Post('create')
  async createDesign(@Req() req, @Body() dto: CreateDesignDto) {
    const userId = req.user.id;
    // Delegate classification to AI-driven workflow (no hardcoded keywords)
    const result = await this.designWorkflowService.processDesignRequest(userId, dto);
    return {
      status: true,
      message: 'Design variations generated. Provide name, price, quantity and deadline to approve.',
      data: result,
    };
  }
  @Post('variation')
  async createDesignVariation(@Req() req, @Body() dto: CreateDesignVariationDto) {
    const userId = req.user.id;
    const result = await this.designWorkflowService.processDesignVariation(userId, dto.chatId, dto.prompt);
    return {
      status: true,
      message: 'Design variation created successfully',
      data: result,
    };
  }

  @Post('approve')
  async approveDesign(@Req() req, @Body() dto: ApproveDesignDto) {
    const userId = req.user.id;
    const result = await this.designWorkflowService.approveDesign(userId, dto);
    
    return {
      status: true,
      message: result.message,
      data: {
        nft: result.nft,
        chatId: dto.chatId,
        nextSteps: [
          'Publish to Market (triggers minting)',
          'Hire a Maker (triggers minting if in DRAFT status)'
        ]
      }
    };
  }

  @Post('approve-simple')
  async simpleApproveDesign(@Req() req, @Body() dto: SimpleApproveDesignDto) {
    const userId = req.user.id;
    const result = await this.designWorkflowService.simpleApproveDesign(userId, dto);
    
    return {
      status: true,
      message: result.message,
      data: {
        nft: result.nft,
        chatId: dto.chatId,
        aiGenerated: true,
        nextSteps: [
          'Publish to Market (triggers minting)',
          'Hire a Maker (triggers minting if in DRAFT status)'
        ]
      }
    };
  }

  @Post('complete-listing')
  async completeJobListing(@Req() req, @Body() dto: { chatId: string }) {
    const userId = req.user.id;
    const result = await this.chatService.completeJobListing(userId, dto.chatId);
    return {
      status: true,
      message: 'Job listed successfully',
      data: result,
    };
  }

  @Post('store')
  async storeDesign(@Req() req, @Body() dto: StoreDesignDto) {
    const userId = req.user.id;
    const result = await this.chatService.storeDesign(userId, dto.chatId, dto.name, dto.description);
    return {
      status: true,
      message: 'Design stored successfully',
      data: result,
    };
  }

  @Post('publish-to-market')
  async publishToMarket(@Req() req, @Body() dto: { nftId: string }) {
    const userId = req.user.id;
    
    // This endpoint will trigger the web3 modal for minting
    // The frontend should handle the web3 interaction and then call the mint endpoint
    return {
      status: true,
      message: 'Ready to mint design! Please complete the web3 transaction.',
      data: {
        nftId: dto.nftId,
        action: 'mint_and_publish',
        web3Required: true
      }
    };
  }

  @Post('mint-and-publish')
  async mintAndPublish(@Req() req, @Body() dto: { nftId: string; transactionHash: string }) {
    const userId = req.user.id;
    
    // Mint the NFT and change status to PUBLISHED
    const nft = await this.designWorkflowService.mintAndPublishDesign(userId, dto.nftId, dto.transactionHash);
    
    return {
      status: true,
      message: 'Design minted and published successfully!',
      data: {
        nft,
        status: 'published',
        marketReady: true
      }
    };
  }
  // Removed keyword-based classification – now handled by AI in workflow service
}