"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StreamChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamChatService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stream_chat_1 = require("stream-chat");
let StreamChatService = StreamChatService_1 = class StreamChatService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StreamChatService_1.name);
    }
    onModuleInit() {
        const apiKey = this.configService.get('STREAM_API_KEY');
        const apiSecret = this.configService.get('STREAM_API_SECRET');
        this.logger.log(`Stream Chat config check - API Key: ${apiKey ? 'Found' : 'Missing'}, Secret: ${apiSecret ? 'Found' : 'Missing'}`);
        if (!apiKey || !apiSecret) {
            this.logger.error('Stream Chat API key or secret not found');
            return;
        }
        this.client = stream_chat_1.StreamChat.getInstance(apiKey, apiSecret);
        this.logger.log('Stream Chat client initialized successfully');
    }
    async createUserToken(userId) {
        if (!this.client) {
            throw new Error('Stream Chat not configured. Please set STREAM_API_KEY and STREAM_API_SECRET in your environment variables.');
        }
        return this.client.createToken(userId);
    }
    async upsertUser(userId, userData) {
        if (!this.client) {
            this.logger.warn('Stream Chat not configured, skipping user upsert');
            return { success: true };
        }
        try {
            let streamRole = 'user';
            if (userData.userType === 'creator' || userData.userType === 'maker') {
                streamRole = 'user';
            }
            await this.client.upsertUser({
                id: userId,
                name: userData.fullName || 'Astra User',
                role: streamRole,
                image: userData.avatar || undefined,
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error upserting user: ${error.message}`);
            throw error;
        }
    }
    async createChannel(channelId, creatorId, makerId) {
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
        }
        catch (error) {
            this.logger.error(`Error creating channel: ${error.message}`);
            throw error;
        }
    }
    async sendAIMessage(channelId, message, attachments = []) {
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
        }
        catch (error) {
            this.logger.error(`Error sending AI message: ${error.message}`);
            throw error;
        }
    }
    async addReactionButtons(messageId, channelId, buttons) {
        if (!this.client) {
            this.logger.warn('Stream Chat not configured, skipping reaction buttons');
            return { success: true };
        }
        try {
            const channel = this.client.channel('messaging', channelId);
            await channel.sendReaction(messageId, {
                type: 'buttons',
                options: buttons.map(text => ({ text, value: text.toLowerCase().replace(/\s+/g, '_') })),
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error adding reaction buttons: ${error.message}`);
            throw error;
        }
    }
    async updateChannelState(channelId, state, metadata = {}) {
        try {
            const channel = this.client.channel('messaging', channelId);
            await channel.updatePartial({
                set: {
                    state,
                    ...metadata,
                },
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error updating channel state: ${error.message}`);
            throw error;
        }
    }
};
exports.StreamChatService = StreamChatService;
exports.StreamChatService = StreamChatService = StreamChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StreamChatService);
//# sourceMappingURL=stream-chat.service.js.map