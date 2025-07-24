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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const chat_service_1 = require("../services/chat.service");
const stream_chat_service_1 = require("../services/stream-chat.service");
const chat_dto_1 = require("../dto/chat.dto");
let ChatController = class ChatController {
    constructor(chatService, streamChatService) {
        this.chatService = chatService;
        this.streamChatService = streamChatService;
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
    async getStreamToken(req) {
        const userId = req.user.id;
        const token = await this.streamChatService.createUserToken(userId);
        return {
            status: true,
            message: 'Stream Chat token generated successfully',
            data: { token, userId },
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
    async generateDesign(dto) {
        const design = await this.chatService.generateDesign(dto);
        return {
            status: true,
            message: 'Design generated successfully',
            data: design,
        };
    }
    async listDesign(dto) {
        const job = await this.chatService.listDesign(dto);
        return {
            status: true,
            message: 'Design listed successfully',
            data: job,
        };
    }
    async addMakerProposal(dto) {
        const proposal = await this.chatService.addMakerProposal(dto);
        return {
            status: true,
            message: 'Maker proposal added successfully',
            data: proposal,
        };
    }
    async handleEscrowAction(dto) {
        const result = await this.chatService.handleEscrowAction(dto);
        return {
            status: true,
            message: 'Escrow action processed successfully',
            data: result,
        };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.CreateChatDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createChat", null);
__decorate([
    (0, common_1.Get)('token'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getStreamToken", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChat", null);
__decorate([
    (0, common_1.Post)('message'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('design/generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.GenerateDesignDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "generateDesign", null);
__decorate([
    (0, common_1.Post)('design/list'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.ListDesignDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "listDesign", null);
__decorate([
    (0, common_1.Post)('maker/proposal'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.MakerProposalDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addMakerProposal", null);
__decorate([
    (0, common_1.Post)('escrow'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.EscrowActionDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "handleEscrowAction", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('ai-chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        stream_chat_service_1.StreamChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map