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
exports.AiGeneratedImage = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const chat_entity_1 = require("./chat.entity");
let AiGeneratedImage = class AiGeneratedImage extends base_entity_1.BaseEntity {
};
exports.AiGeneratedImage = AiGeneratedImage;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiGeneratedImage.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AiGeneratedImage.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], AiGeneratedImage.prototype, "generationParams", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], AiGeneratedImage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_entity_1.AiChatMessage, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'messageId' }),
    __metadata("design:type", chat_entity_1.AiChatMessage)
], AiGeneratedImage.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiGeneratedImage.prototype, "messageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], AiGeneratedImage.prototype, "isSelected", void 0);
exports.AiGeneratedImage = AiGeneratedImage = __decorate([
    (0, typeorm_1.Entity)('ai_generated_images')
], AiGeneratedImage);
//# sourceMappingURL=image-generation.entity.js.map