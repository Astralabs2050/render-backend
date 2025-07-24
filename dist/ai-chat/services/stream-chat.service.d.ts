import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel } from 'stream-chat';
import { ChatState } from '../entities/chat.entity';
export declare class StreamChatService implements OnModuleInit {
    private configService;
    private readonly logger;
    private client;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    createUserToken(userId: string): Promise<string>;
    upsertUser(userId: string, userData: any): Promise<any>;
    createChannel(channelId: string, creatorId: string, makerId?: string): Promise<Channel>;
    sendAIMessage(channelId: string, message: string, attachments?: any[]): Promise<any>;
    addReactionButtons(messageId: string, channelId: string, buttons: string[]): Promise<any>;
    updateChannelState(channelId: string, state: ChatState, metadata?: any): Promise<any>;
}
