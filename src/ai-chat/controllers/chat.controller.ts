import { Controller, Post, Get, Body, Param, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { InteractiveChatService } from '../services/interactive-chat.service';
import { StreamChatService } from '../services/stream-chat.service';
import { SendMessageDto } from '../dto/chat.dto';
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(
    private readonly chatService: ChatService,
    private readonly interactiveChatService: InteractiveChatService,
    private readonly streamChatService: StreamChatService,
  ) {}
  @Post('start')
  async startChat(@Req() req) {
    const userId = req.user.id;
    const chat = await this.interactiveChatService.startDesignChat(userId);
    return {
      status: true,
      message: 'Design chat started',
      data: chat,
    };
  }
  @Get('token')
  async getStreamToken(@Req() req) {
    const userId = req.user.id;
    const token = await this.streamChatService.createUserToken(userId);
    return {
      status: true,
      message: 'Stream Chat token generated',
      data: { 
        token, 
        userId,
        apiKey: process.env.STREAM_API_KEY 
      },
    };
  }
  @Post('message')
  async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    const userId = req.user.id;
    let chatId = dto.chatId;
    if (!chatId) {
      const chat = await this.interactiveChatService.startDesignChat(userId);
      chatId = chat.id;
    }
    const response = await this.interactiveChatService.processMessage(userId, {
      ...dto,
      chatId
    });
    return {
      status: true,
      message: 'Message processed successfully',
      data: {
        ...response,
        chatId,
      },
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

  @Post('process-payment')
  async processPayment(@Req() req, @Body() dto: { chatId: string }) {
    const userId = req.user.id;
    const result = await this.chatService.processPaymentForChat(userId, dto.chatId);
    return {
      status: true,
      message: 'Payment processed successfully',
      data: result,
    };
  }
}