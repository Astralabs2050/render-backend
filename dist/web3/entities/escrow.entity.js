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
exports.EscrowMilestone = exports.EscrowContract = exports.MilestoneStatus = exports.EscrowStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const chat_entity_1 = require("../../ai-chat/entities/chat.entity");
const nft_entity_1 = require("./nft.entity");
var EscrowStatus;
(function (EscrowStatus) {
    EscrowStatus["CREATED"] = "created";
    EscrowStatus["FUNDED"] = "funded";
    EscrowStatus["IN_PROGRESS"] = "in_progress";
    EscrowStatus["COMPLETED"] = "completed";
    EscrowStatus["DISPUTED"] = "disputed";
    EscrowStatus["CANCELLED"] = "cancelled";
})(EscrowStatus || (exports.EscrowStatus = EscrowStatus = {}));
var MilestoneStatus;
(function (MilestoneStatus) {
    MilestoneStatus["PENDING"] = "pending";
    MilestoneStatus["IN_PROGRESS"] = "in_progress";
    MilestoneStatus["COMPLETED"] = "completed";
    MilestoneStatus["APPROVED"] = "approved";
    MilestoneStatus["DISPUTED"] = "disputed";
})(MilestoneStatus || (exports.MilestoneStatus = MilestoneStatus = {}));
let EscrowContract = class EscrowContract extends base_entity_1.BaseEntity {
};
exports.EscrowContract = EscrowContract;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EscrowContract.prototype, "contractAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], EscrowContract.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EscrowStatus,
        default: EscrowStatus.CREATED,
    }),
    __metadata("design:type", String)
], EscrowContract.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'creatorId' }),
    __metadata("design:type", user_entity_1.User)
], EscrowContract.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EscrowContract.prototype, "creatorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'makerId' }),
    __metadata("design:type", user_entity_1.User)
], EscrowContract.prototype, "maker", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EscrowContract.prototype, "makerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => nft_entity_1.NFT, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'nftId' }),
    __metadata("design:type", nft_entity_1.NFT)
], EscrowContract.prototype, "nft", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], EscrowContract.prototype, "nftId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_entity_1.Chat, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'chatId' }),
    __metadata("design:type", chat_entity_1.Chat)
], EscrowContract.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], EscrowContract.prototype, "chatId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => EscrowMilestone, milestone => milestone.escrow, { cascade: true }),
    __metadata("design:type", Array)
], EscrowContract.prototype, "milestones", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], EscrowContract.prototype, "transactionHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], EscrowContract.prototype, "fundedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], EscrowContract.prototype, "completedAt", void 0);
exports.EscrowContract = EscrowContract = __decorate([
    (0, typeorm_1.Entity)('escrow_contracts')
], EscrowContract);
let EscrowMilestone = class EscrowMilestone extends base_entity_1.BaseEntity {
};
exports.EscrowMilestone = EscrowMilestone;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EscrowMilestone.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], EscrowMilestone.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], EscrowMilestone.prototype, "percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], EscrowMilestone.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], EscrowMilestone.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MilestoneStatus,
        default: MilestoneStatus.PENDING,
    }),
    __metadata("design:type", String)
], EscrowMilestone.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => EscrowContract, escrow => escrow.milestones, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'escrowId' }),
    __metadata("design:type", EscrowContract)
], EscrowMilestone.prototype, "escrow", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EscrowMilestone.prototype, "escrowId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], EscrowMilestone.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], EscrowMilestone.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], EscrowMilestone.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], EscrowMilestone.prototype, "transactionHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], EscrowMilestone.prototype, "metadata", void 0);
exports.EscrowMilestone = EscrowMilestone = __decorate([
    (0, typeorm_1.Entity)('escrow_milestones')
], EscrowMilestone);
//# sourceMappingURL=escrow.entity.js.map