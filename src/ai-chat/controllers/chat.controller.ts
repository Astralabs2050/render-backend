import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { StreamChatService } from '../services/stream-chat.service';
import { CreateChatDto, SendMessageDto, GenerateDesignDto, ListDesignDto, MakerProposalDto, EscrowActionDto } from '../dto/chat.dto';

@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly streamChatService: StreamChatService
  ) {}

  @Post()
  async createChat(@Req() req, @Body() dto: CreateChatDto) {
    const userId = req.user.id;
    const chat = await this.chatService.createChat(userId, dto);
    return {
      status: true,
      message: 'Chat created successfully',
      data: chat,
    };
  }

  @Get('token')
  async getStreamToken(@Req() req) {
    const userId = req.user.id;
    const token = await this.streamChatService.createUserToken(userId);
    return {
      status: true,
      message: 'Stream Chat token generated successfully',
      data: { token, userId },
    };
  }

  @Get()
  async getChats(@Req() req) {
    const userId = req.user.id;
    const chats = await this.chatService.getChats(userId);
    return {
      status: true,
      message: 'Chats retrieved successfully',
      data: chats,
    };
  }

  @Get(':id')
  async getChat(@Req() req, @Param('id') chatId: string) {
    const userId = req.user.id;
    const chat = await this.chatService.getChat(userId, chatId);
    return {
      status: true,
      message: 'Chat retrieved successfully',
      data: chat,
    };
  }

  @Post('message')
  async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    const userId = req.user.id;
    const message = await this.chatService.sendMessage(userId, dto);
    return {
      status: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Post('design/generate')
  async generateDesign(@Body() dto: GenerateDesignDto) {
    const design = await this.chatService.generateDesign(dto);
    return {
      status: true,
      message: 'Design generated successfully',
      data: design,
    };
  }

  @Post('design/list')
  async listDesign(@Body() dto: ListDesignDto) {
    const job = await this.chatService.listDesign(dto);
    return {
      status: true,
      message: 'Design listed successfully',
      data: job,
    };
  }

  @Post('maker/proposal')
  async addMakerProposal(@Body() dto: MakerProposalDto) {
    const proposal = await this.chatService.addMakerProposal(dto);
    return {
      status: true,
      message: 'Maker proposal added successfully',
      data: proposal,
    };
  }

  @Post('escrow')
  async handleEscrowAction(@Body() dto: EscrowActionDto) {
    const result = await this.chatService.handleEscrowAction(dto);
    return {
      status: true,
      message: 'Escrow action processed successfully',
      data: result,
    };
  }
  
}