import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamChat, Channel } from 'stream-chat';
import { ChatState } from '../entities/chat.entity';
import { ButtonReaction } from '../types/reaction.types';

@Injectable()
export class StreamChatService implements OnModuleInit {
  private readonly logger = new Logger(StreamChatService.name);
  private client: StreamChat;

  constructor(private configService: ConfigService) { }

  onModuleInit() {
    const apiKey = this.configService.get<string>('STREAM_API_KEY');
    const apiSecret = this.configService.get<string>('STREAM_API_SECRET');

    this.logger.log(`Stream Chat config check - API Key: ${apiKey ? 'Found' : 'Missing'}, Secret: ${apiSecret ? 'Found' : 'Missing'}`);

    if (!apiKey || !apiSecret) {
      this.logger.error('Stream Chat API key or secret not found');
      return;
    }

    this.client = StreamChat.getInstance(apiKey, apiSecret);
    this.logger.log('Stream Chat client initialized successfully');
  }

  async createUserToken(userId: string): Promise<string> {
    if (!this.client) {
      throw new Error('Stream Chat not configured. Please set STREAM_API_KEY and STREAM_API_SECRET in your environment variables.');
    }
    return this.client.createToken(userId);
  }

  async upsertUser(userId: string, userData: any): Promise<any> {
    if (!this.client) {
      this.logger.warn('Stream Chat not configured, skipping user upsert');
      return { success: true };
    }
    try {
      // Map custom roles to Stream Chat standard roles
      let streamRole = 'user';
      if (userData.userType === 'creator' || userData.userType === 'maker') {
        streamRole = 'user'; // Use standard 'user' role for both creators and makers
      }

      await this.client.upsertUser({
        id: userId,
        name: userData.fullName || 'Astra User',
        role: streamRole,
        image: userData.avatar || undefined,
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Error upserting user: ${error.message}`);
      throw error;
    }
  }

  async createChannel(channelId: string, creatorId: string, makerId?: string): Promise<Channel> {
    if (!this.client) {
      this.logger.warn('Stream Chat not configured, skipping channel creation');
      return null;
    }
    try {
      const channelData = {
        created_by_id: creatorId,
        members: makerId ? [creatorId, makerId, 'astra-ai'] : [creatorId, 'astra-ai'],
        name: `Chat ${channelId.substring(0, 8)}`,
      };

      const channel = this.client.channel('messaging', channelId, channelData);
      await channel.create();

      return channel;
    } catch (error) {
      this.logger.error(`Error creating channel: ${error.message}`);
      throw error;
    }
  }

  async sendAIMessage(channelId: string, message: string, attachments: any[] = []): Promise<any> {
    if (!this.client) {
      this.logger.warn('Stream Chat not configured, skipping AI message send');
      return { message: { id: 'mock-message-id' } };
    }
    try {
      const channel = this.client.channel('messaging', channelId);

      const response = await channel.sendMessage({
        text: message,
        user_id: 'astra-ai',
        attachments,
      });

      return response;
    } catch (error) {
      this.logger.error(`Error sending AI message: ${error.message}`);
      throw error;
    }
  }

  async addReactionButtons(messageId: string, channelId: string, buttons: string[]): Promise<any> {
    if (!this.client) {
      this.logger.warn('Stream Chat not configured, skipping reaction buttons');
      return { success: true };
    }
    try {
      const channel = this.client.channel('messaging', channelId);

      await channel.sendReaction(messageId, {
        type: 'buttons',
        options: buttons.map(text => ({ text, value: text.toLowerCase().replace(/\s+/g, '_') })),
      } as ButtonReaction);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error adding reaction buttons: ${error.message}`);
      throw error;
    }
  }

  async updateChannelState(channelId: string, state: ChatState, metadata: any = {}): Promise<any> {
    try {
      const channel = this.client.channel('messaging', channelId);

      await channel.updatePartial({
        set: {
          state,
          ...metadata,
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error updating channel state: ${error.message}`);
      throw error;
    }
  }
}