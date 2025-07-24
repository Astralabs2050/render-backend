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
exports.ChatMessage = exports.Chat = exports.ChatState = exports.UserType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const user_entity_1 = require("../../users/entities/user.entity");
var UserType;
(function (UserType) {
    UserType["CREATOR"] = "creator";
    UserType["MAKER"] = "maker";
})(UserType || (exports.UserType = UserType = {}));
var ChatState;
(function (ChatState) {
    ChatState["WELCOME"] = "welcome";
    ChatState["INTENT"] = "intent";
    ChatState["INFO_GATHER"] = "info_gather";
    ChatState["DESIGN_PREVIEW"] = "design_preview";
    ChatState["LISTED"] = "listed";
    ChatState["MAKER_PROPOSAL"] = "maker_proposal";
    ChatState["ESCROW_PAYMENT"] = "escrow_payment";
    ChatState["FABRIC_SHIPPING"] = "fabric_shipping";
    ChatState["SAMPLE_REVIEW"] = "sample_review";
    ChatState["FINAL_REVIEW"] = "final_review";
    ChatState["DELIVERY"] = "delivery";
    ChatState["COMPLETED"] = "completed";
})(ChatState || (exports.ChatState = ChatState = {}));
let Chat = class Chat extends base_entity_1.BaseEntity {
};
exports.Chat = Chat;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chat.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ChatState,
        default: ChatState.WELCOME,
    }),
    __metadata("design:type", String)
], Chat.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Chat.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], Chat.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chat.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'creatorId' }),
    __metadata("design:type", user_entity_1.User)
], Chat.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chat.prototype, "creatorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'makerId' }),
    __metadata("design:type", user_entity_1.User)
], Chat.prototype, "maker", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "makerId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChatMessage, message => message.chat, { cascade: true }),
    __metadata("design:type", Array)
], Chat.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "designImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "escrowId", void 0);
exports.Chat = Chat = __decorate([
    (0, typeorm_1.Entity)('ai_chats')
], Chat);
let ChatMessage = class ChatMessage extends base_entity_1.BaseEntity {
};
exports.ChatMessage = ChatMessage;
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ChatMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], ChatMessage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Chat, chat => chat.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'chatId' }),
    __metadata("design:type", Chat)
], ChatMessage.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "chatId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "actionType", void 0);
exports.ChatMessage = ChatMessage = __decorate([
    (0, typeorm_1.Entity)('ai_chat_messages')
], ChatMessage);
//# sourceMappingURL=chat.entity.js.map