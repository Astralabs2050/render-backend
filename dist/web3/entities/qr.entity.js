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
exports.QRCode = exports.QRCodeType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const nft_entity_1 = require("./nft.entity");
const user_entity_1 = require("../../users/entities/user.entity");
var QRCodeType;
(function (QRCodeType) {
    QRCodeType["PRODUCT"] = "product";
    QRCodeType["VERIFICATION"] = "verification";
    QRCodeType["TRACKING"] = "tracking";
})(QRCodeType || (exports.QRCodeType = QRCodeType = {}));
let QRCode = class QRCode extends base_entity_1.BaseEntity {
};
exports.QRCode = QRCode;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QRCode.prototype, "hash", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QRCode.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QRCode.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: QRCodeType,
        default: QRCodeType.PRODUCT,
    }),
    __metadata("design:type", String)
], QRCode.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => nft_entity_1.NFT, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'nftId' }),
    __metadata("design:type", nft_entity_1.NFT)
], QRCode.prototype, "nft", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QRCode.prototype, "nftId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", user_entity_1.User)
], QRCode.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QRCode.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], QRCode.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], QRCode.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], QRCode.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], QRCode.prototype, "scanCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], QRCode.prototype, "lastScannedAt", void 0);
exports.QRCode = QRCode = __decorate([
    (0, typeorm_1.Entity)('qr_codes')
], QRCode);
//# sourceMappingURL=qr.entity.js.map