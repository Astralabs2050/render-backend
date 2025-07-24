import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat/chat.service';
import { ImageGenerationService } from './image-generation/image-generation.service';
import { MetadataExtractionService } from './metadata-extraction/metadata-extraction.service';
import { CreateChatDto, SendMessageDto, GenerateImageDto, ExtractMetadataDto } from './dto/chat.dto';
import { ExtractedMetadata } from './interfaces/metadata.interface';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly chatService: ChatService,
    private readonly imageGenerationService: ImageGenerationService,
    private readonly metadataExtractionService: MetadataExtractionService,
  ) {}

  @Post('chat')
  async createChat(@Req() req, @Body() dto: CreateChatDto) {
    const userId = req.user.id;
    const chat = await this.chatService.createChat(userId, dto);
    return {
      status: true,
      message: 'Chat created successfully',
      data: chat,
    };
  }

  @Get('chat')
  async getChats(@Req() req) {
    const userId = req.user.id;
    const chats = await this.chatService.getChats(userId);
    return {
      status: true,
      message: 'Chats retrieved successfully',
      data: chats,
    };
  }

  @Get('chat/:id')
  async getChat(@Req() req, @Param('id') chatId: string) {
    const userId = req.user.id;
    const chat = await this.chatService.getChat(userId, chatId);
    return {
      status: true,
      message: 'Chat retrieved successfully',
      data: chat,
    };
  }

  @Post('chat/message')
  async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    const userId = req.user.id;
    const message = await this.chatService.sendMessage(userId, dto);
    return {
      status: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Post('generate-images')
  async generateImages(@Body() dto: GenerateImageDto) {
    const images = await this.imageGenerationService.generateImages(dto);
    return {
      status: true,
      message: 'Images generated successfully',
      data: images,
    };
  }

  @Post('extract-metadata')
  async extractMetadata(@Body() dto: ExtractMetadataDto): Promise<{ status: boolean; message: string; data: ExtractedMetadata }> {
    const metadata = await this.metadataExtractionService.extractMetadata(dto);
    return {
      status: true,
      message: 'Metadata extracted successfully',
      data: metadata,
    };
  }
}