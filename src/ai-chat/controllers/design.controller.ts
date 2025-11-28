import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DesignWorkflowService } from '../services/design-workflow.service';
import { ChatService } from '../services/chat.service';
import { StoreDesignDto, ApproveDesignDto, SimpleApproveDesignDto } from '../dto/design.dto';
@Controller('design')
@UseGuards(JwtAuthGuard)
export class DesignController {
  constructor(
    private readonly designWorkflowService: DesignWorkflowService,
    private readonly chatService: ChatService
  ) {}

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
          'Complete Payment to add to My Designs',
          'Then: Hire a Maker (triggers minting to marketplace)'
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
          'Complete Payment to add to My Designs',
          'Then: Hire a Maker (triggers minting to marketplace)'
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

  @Post('pay-for-design')
  async payForDesign(@Req() req, @Body() dto: { chatId: string; paymentTransactionHash: string }) {
    const userId = req.user.id;
    const result = await this.designWorkflowService.payForDesign(userId, dto.chatId, dto.paymentTransactionHash);
    return {
      status: true,
      message: 'Payment successful! Design added to My Designs.',
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