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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const chat_service_1 = require("./chat/chat.service");
const image_generation_service_1 = require("./image-generation/image-generation.service");
const metadata_extraction_service_1 = require("./metadata-extraction/metadata-extraction.service");
const chat_dto_1 = require("./dto/chat.dto");
let AiController = class AiController {
    constructor(chatService, imageGenerationService, metadataExtractionService) {
        this.chatService = chatService;
        this.imageGenerationService = imageGenerationService;
        this.metadataExtractionService = metadataExtractionService;
    }
    async createChat(req, dto) {
        const userId = req.user.id;
        const chat = await this.chatService.createChat(userId, dto);
        return {
            status: true,
            message: 'Chat created successfully',
            data: chat,
        };
    }
    async getChats(req) {
        const userId = req.user.id;
        const chats = await this.chatService.getChats(userId);
        return {
            status: true,
            message: 'Chats retrieved successfully',
            data: chats,
        };
    }
    async getChat(req, chatId) {
        const userId = req.user.id;
        const chat = await this.chatService.getChat(userId, chatId);
        return {
            status: true,
            message: 'Chat retrieved successfully',
            data: chat,
        };
    }
    async sendMessage(req, dto) {
        const userId = req.user.id;
        const message = await this.chatService.sendMessage(userId, dto);
        return {
            status: true,
            message: 'Message sent successfully',
            data: message,
        };
    }
    async generateImages(dto) {
        const images = await this.imageGenerationService.generateImages(dto);
        return {
            status: true,
            message: 'Images generated successfully',
            data: images,
        };
    }
    async extractMetadata(dto) {
        const metadata = await this.metadataExtractionService.extractMetadata(dto);
        return {
            status: true,
            message: 'Metadata extracted successfully',
            data: metadata,
        };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.CreateChatDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "createChat", null);
__decorate([
    (0, common_1.Get)('chat'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getChats", null);
__decorate([
    (0, common_1.Get)('chat/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getChat", null);
__decorate([
    (0, common_1.Post)('chat/message'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('generate-images'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.GenerateImageDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateImages", null);
__decorate([
    (0, common_1.Post)('extract-metadata'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.ExtractMetadataDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "extractMetadata", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        image_generation_service_1.ImageGenerationService,
        metadata_extraction_service_1.MetadataExtractionService])
], AiController);
//# sourceMappingURL=ai.controller.js.map