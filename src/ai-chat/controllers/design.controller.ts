import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DesignWorkflowService } from '../services/design-workflow.service';
import { ChatService } from '../services/chat.service';
import { CreateDesignDto, CreateDesignVariationDto, StoreDesignDto } from '../dto/design.dto';
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
    if (!this.isDesignPrompt(dto.prompt)) {
      throw new BadRequestException(
        'Please provide a fashion design prompt (e.g., "white satin dress with cutouts", "blue denim jacket with patches")'
      );
    }
    const result = await this.designWorkflowService.processDesignRequest(userId, dto);
    return {
      status: true,
      message: 'Design created and listed successfully! We\'ll notify you when a Maker applies.',
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
  async approveDesign(@Req() req, @Body() dto: { chatId: string }) {
    const userId = req.user.id;
    const chat = await this.chatService.getChat(userId, dto.chatId);
    
    await this.chatService.sendMessage(userId, {
      chatId: dto.chatId,
      content: 'approve'
    });
    
    return {
      status: true,
      message: 'Design approved, please provide job details',
      data: { chatId: dto.chatId }
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
  private isDesignPrompt(prompt: string): boolean {
    const fashionKeywords = [
      'dress', 'shirt', 'pants', 'jacket', 'skirt', 'top', 'blouse', 'coat',
      'sweater', 'hoodie', 'jeans', 'shorts', 'suit', 'blazer', 'cardigan',
      'fabric', 'cotton', 'silk', 'denim', 'leather', 'satin', 'lace',
      'color', 'pattern', 'style', 'design', 'fashion', 'clothing', 'outfit',
      'sleeves', 'collar', 'buttons', 'zipper', 'pockets', 'hem', 'cut'
    ];
    const lowerPrompt = prompt.toLowerCase();
    return fashionKeywords.some(keyword => lowerPrompt.includes(keyword));
  }
}