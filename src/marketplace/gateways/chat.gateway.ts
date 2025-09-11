import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../services/chat.service';
import { MessageType } from '../entities/message.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      console.log(`Client connected: ${client.id} - User: ${payload.sub}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id} - User: ${client.data?.userId}`);
    // Cleanup client data
    delete client.data;
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client.data.userId || !data.chatId) {
        throw new WsException('Invalid request');
      }
      
      // Validate user has access to this chat
      const chat = await this.chatService.validateChatAccess(data.chatId, client.data.userId);
      if (!chat) {
        throw new WsException('Chat not found or access denied');
      }
      
      await client.join(data.chatId);
      client.emit('joinedChat', { chatId: data.chatId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; content: string; type?: MessageType },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client.data.userId || !data.chatId || !data.content?.trim()) {
        throw new WsException('Invalid message data');
      }
      
      if (data.content.length > 1000) {
        throw new WsException('Message too long');
      }
      
      const message = await this.chatService.sendMessage(
        data.chatId,
        client.data.userId,
        data.content.trim(),
        data.type,
      );

      client.to(data.chatId).emit('newMessage', message);
      client.emit('messageSent', message);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client.data.userId) {
        throw new WsException('Unauthorized');
      }
      client.to(data.chatId).emit('userTyping', {
        chatId: data.chatId,
        userId: client.data.userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }
}