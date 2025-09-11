import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { MessageType } from '../entities/message.entity';

@Controller('marketplace/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('create')
  async createChat(@Body() body: { jobId: string; makerId: string }, @Req() req) {
    const chat = await this.chatService.createChat(body.jobId, req.user.id, body.makerId);
    return {
      status: true,
      message: 'Chat created successfully',
      data: chat,
    };
  }

  @Post(':chatId/message')
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() body: { content: string; type?: MessageType },
    @Req() req
  ) {
    const message = await this.chatService.sendMessage(
      chatId,
      req.user.id,
      body.content,
      body.type
    );
    return {
      status: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Get(':chatId/messages')
  async getMessages(@Param('chatId') chatId: string, @Req() req) {
    const messages = await this.chatService.getMessages(chatId, req.user.id);
    return {
      status: true,
      message: 'Messages retrieved successfully',
      data: messages,
    };
  }

  @Get('my-chats')
  async getUserChats(@Req() req) {
    const chats = await this.chatService.getUserChats(req.user.id);
    return {
      status: true,
      message: 'Chats retrieved successfully',
      data: chats,
    };
  }
}