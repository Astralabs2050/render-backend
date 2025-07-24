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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatMessage = exports.AiChat = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let AiChat = class AiChat extends base_entity_1.BaseEntity {
};
exports.AiChat = AiChat;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiChat.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], AiChat.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiChat.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AiChatMessage, message => message.chat, { cascade: true }),
    __metadata("design:type", Array)
], AiChat.prototype, "messages", void 0);
exports.AiChat = AiChat = __decorate([
    (0, typeorm_1.Entity)('ai_chats')
], AiChat);
let AiChatMessage = class AiChatMessage extends base_entity_1.BaseEntity {
};
exports.AiChatMessage = AiChatMessage;
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AiChatMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiChatMessage.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], AiChatMessage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => AiChat, chat => chat.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'chatId' }),
    __metadata("design:type", AiChat)
], AiChatMessage.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiChatMessage.prototype, "chatId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AiChatMessage.prototype, "imageUrl", void 0);
exports.AiChatMessage = AiChatMessage = __decorate([
    (0, typeorm_1.Entity)('ai_chat_messages')
], AiChatMessage);
//# sourceMappingURL=chat.entity.js.map