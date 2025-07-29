import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DesignWorkflowService } from '../services/design-workflow.service';
import { ChatService } from '../services/chat.service';
import { CreateDesignDto, StoreDesignDto } from '../dto/design.dto';
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