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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const chat_entity_1 = require("../entities/chat.entity");
const image_generation_service_1 = require("../image-generation/image-generation.service");
let ChatService = ChatService_1 = class ChatService {
    constructor(chatRepository, messageRepository, configService, imageGenerationService) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.configService = configService;
        this.imageGenerationService = imageGenerationService;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async createChat(userId, dto) {
        const chat = this.chatRepository.create({
            ...dto,
            userId,
        });
        return this.chatRepository.save(chat);
    }
    async getChats(userId) {
        return this.chatRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async getChat(userId, chatId) {
        const chat = await this.chatRepository.findOne({
            where: { id: chatId, userId },
            relations: ['messages'],
            order: { messages: { createdAt: 'ASC' } },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        return chat;
    }
    async sendMessage(userId, dto) {
        const { content, chatId, imageBase64 } = dto;
        const chat = await this.chatRepository.findOne({
            where: { id: chatId, userId },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        const userMessage = this.messageRepository.create({
            content,
            role: 'user',
            chatId,
        });
        await this.messageRepository.save(userMessage);
        let imageUrl = null;
        if (imageBase64) {
            userMessage.imageUrl = 'mock-image-url';
            await this.messageRepository.save(userMessage);
        }
        const aiResponse = await this.generateAiResponse(content, imageUrl);
        const aiMessage = this.messageRepository.create({
            content: aiResponse,
            role: 'assistant',
            chatId,
        });
        const savedAiMessage = await this.messageRepository.save(aiMessage);
        if (this.isOutfitGenerationRequest(content)) {
            await this.imageGenerationService.generateImages({
                prompt: content,
                chatId,
                messageId: savedAiMessage.id,
                provider: 'stable-diffusion',
            });
        }
        return savedAiMessage;
    }
    async generateAiResponse(content, imageUrl) {
        try {
            if (this.isOutfitGenerationRequest(content)) {
                return "I'll create a white satin dress with cutouts and a train for you. Here are some design ideas:\n\n1. A floor-length white satin gown with side cutouts and a flowing train\n2. An asymmetrical white satin dress with geometric cutouts and a short train\n3. A structured white satin mini dress with back cutouts and a detachable train\n\nI'm generating these designs for you to preview. Which style would you prefer?";
            }
            else {
                return "I'm here to help with your fashion design needs. Would you like me to create a specific outfit design for you?";
            }
        }
        catch (error) {
            this.logger.error(`AI response generation error: ${error.message}`);
            return "I'm sorry, I couldn't process your request at the moment. Please try again later.";
        }
    }
    isOutfitGenerationRequest(content) {
        const keywords = ['make', 'create', 'design', 'generate', 'dress', 'outfit', 'clothing'];
        const lowercaseContent = content.toLowerCase();
        return keywords.some(keyword => lowercaseContent.includes(keyword));
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.AiChat)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_entity_1.AiChatMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        image_generation_service_1.ImageGenerationService])
], ChatService);
//# sourceMappingURL=chat.service.js.map