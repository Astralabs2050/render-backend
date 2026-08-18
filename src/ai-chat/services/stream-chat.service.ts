import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreamChat, Channel } from 'stream-chat';
import { ChatState, ChatMessage } from '../entities/chat.entity';

@Injectable()
export class StreamChatService implements OnModuleInit {
  private readonly logger = new Logger(StreamChatService.name);
  private client: StreamChat;
  /** Stream API calls can be slow over some networks; 2s was causing false timeouts. */
  private readonly requestTimeoutMs = 30_000;
  constructor(
    private configService: ConfigService,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
  ) { }
  onModuleInit() {
    const apiKey = this.configService.get<string>('STREAM_API_KEY');
    const apiSecret = this.configService.get<string>('STREAM_API_SECRET');
    this.logger.log(`Stream Chat config check - API Key: ${apiKey ? 'Found' : 'Missing'}, Secret: ${apiSecret ? 'Found' : 'Missing'}`);
    if (!apiKey || !apiSecret) {
      this.logger.error('Stream Chat API key or secret not found');
      return;
    }
    this.client = StreamChat.getInstance(apiKey, apiSecret, {
      timeout: this.requestTimeoutMs,
    });
    this.logger.log('Stream Chat client initialized successfully');
    this.ensureBotUser().catch((err) =>
      this.logger.warn(`Could not upsert astra-ai user: ${err?.message || err}`),
    );
  }

  private async ensureBotUser(): Promise<void> {
    if (!this.client) return;
    await this.withTimeout(
      this.client.upsertUser({
        id: 'astra-ai',
        name: 'Astra',
        role: 'admin',
      }),
      'upsertBot',
    );
  }

  private withTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Stream Chat timeout (${label})`));
      }, this.requestTimeoutMs);

      operation
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
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
      let streamRole = 'user';
      if (userData.userType === 'creator' || userData.userType === 'maker') {
        streamRole = 'user';
      }
      const upsertPromise = this.client.upsertUser({
        id: userId,
        name: userData.fullName || 'Astra User',
        role: streamRole,
        image: userData.avatar || undefined,
      });
      await this.withTimeout(upsertPromise, 'upsertUser');
      return { success: true };
    } catch (error) {
      this.logger.error(`Error upserting user: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  async createChannel(channelId: string, creatorId: string, makerId?: string): Promise<Channel> {
    if (!this.client) {
      this.logger.warn('Stream Chat not configured, skipping channel creation');
      return null;
    }
    try {
      await this.ensureBotUser();
      const channelData = {
        created_by_id: creatorId,
        members: makerId ? [creatorId, makerId, 'astra-ai'] : [creatorId, 'astra-ai'],
        name: `Chat ${channelId.substring(0, 8)}`,
      };
      const channel = this.client.channel('messaging', channelId, channelData);
      await this.withTimeout(channel.create(), 'createChannel');
      return channel;
    } catch (error) {
      this.logger.error(`Error creating channel: ${error.message}`);
      return null;
    }
  }
  async sendAIMessage(channelId: string, message: string, attachments: any[] = []): Promise<any> {
    if (!this.client) {
      this.logger.warn('Stream Chat not configured, skipping AI message send');
      await this.syncMessageToDatabase(channelId, message, 'assistant', attachments);
      return { message: { id: 'mock-message-id' } };
    }
    try {
      await this.ensureBotUser();
      const channel = this.client.channel('messaging', channelId);
      await this.syncMessageToDatabase(channelId, message, 'assistant', attachments);

      this.withTimeout(
        channel.sendMessage({
          text: message,
          user_id: 'astra-ai',
          attachments,
        }),
        'sendMessage',
      ).catch((error) => {
        this.logger.error(`Error sending AI message: ${error.message}`);
      });

      return { message: { id: 'queued' } };
    } catch (error) {
      this.logger.error(`Error sending AI message: ${error.message}`);
      await this.syncMessageToDatabase(channelId, message, 'assistant', attachments);
      return { message: { id: 'mock-message-id' } };
    }
  }

  async syncUserMessageToDatabase(channelId: string, message: string, userId: string): Promise<void> {
    await this.syncMessageToDatabase(channelId, message, 'user');
  }

  private async syncMessageToDatabase(
    channelId: string,
    content: string,
    role: 'user' | 'assistant',
    attachments: any[] = [],
  ): Promise<void> {
    try {
      await this.messageRepository.save({
        content,
        role,
        chatId: channelId,
        imageUrl: attachments?.[0]?.image_url || attachments?.[0]?.imageUrl,
        metadata: attachments?.length ? { attachments } : undefined,
      });
    } catch (error) {
      this.logger.error(`Failed to sync message to database: ${error.message}`);
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