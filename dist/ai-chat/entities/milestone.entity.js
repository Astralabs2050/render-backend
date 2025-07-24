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
exports.Milestone = exports.MilestoneStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const chat_entity_1 = require("./chat.entity");
var MilestoneStatus;
(function (MilestoneStatus) {
    MilestoneStatus["PENDING"] = "pending";
    MilestoneStatus["UNLOCKED"] = "unlocked";
    MilestoneStatus["COMPLETED"] = "completed";
})(MilestoneStatus || (exports.MilestoneStatus = MilestoneStatus = {}));
let Milestone = class Milestone extends base_entity_1.BaseEntity {
};
exports.Milestone = Milestone;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Milestone.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Milestone.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Milestone.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], Milestone.prototype, "percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MilestoneStatus,
        default: MilestoneStatus.PENDING,
    }),
    __metadata("design:type", String)
], Milestone.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Milestone.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Milestone.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_entity_1.Chat, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'chatId' }),
    __metadata("design:type", chat_entity_1.Chat)
], Milestone.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Milestone.prototype, "chatId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Milestone.prototype, "order", void 0);
exports.Milestone = Milestone = __decorate([
    (0, typeorm_1.Entity)('ai_milestones')
], Milestone);
//# sourceMappingURL=milestone.entity.js.map