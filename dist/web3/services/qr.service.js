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
var QRService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const qr_entity_1 = require("../entities/qr.entity");
const config_1 = require("@nestjs/config");
const QRCodeGenerator = require("qrcode");
const crypto_1 = require("crypto");
let QRService = QRService_1 = class QRService {
    constructor(qrRepository, configService) {
        this.qrRepository = qrRepository;
        this.configService = configService;
        this.logger = new common_1.Logger(QRService_1.name);
        this.baseUrl = this.configService.get('APP_BASE_URL', 'https://astra.fashion');
    }
    async generateNFTQR(nftId, createdBy) {
        try {
            const url = `${this.baseUrl}/nft/${nftId}`;
            const hash = this.generateHash(url);
            const qrImageBuffer = await QRCodeGenerator.toBuffer(url, {
                type: 'png',
                width: 512,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
            });
            const imageUrl = await this.uploadQRImage(qrImageBuffer, `qr-${hash}.png`);
            const qrCode = this.qrRepository.create({
                hash,
                url,
                imageUrl,
                type: qr_entity_1.QRCodeType.PRODUCT,
                nftId,
                createdBy: createdBy || 'system',
                metadata: {
                    generatedAt: new Date().toISOString(),
                    version: '1.0',
                },
            });
            const savedQR = await this.qrRepository.save(qrCode);
            this.logger.log(`QR code generated for NFT ${nftId}: ${savedQR.id}`);
            return savedQR;
        }
        catch (error) {
            this.logger.error(`Failed to generate QR code: ${error.message}`);
            throw error;
        }
    }
    async generateVerificationQR(nftId, createdBy) {
        try {
            const url = `${this.baseUrl}/verify/${nftId}`;
            const hash = this.generateHash(url);
            const qrImageBuffer = await QRCodeGenerator.toBuffer(url, {
                type: 'png',
                width: 256,
                margin: 1,
                color: {
                    dark: '#1a365d',
                    light: '#ffffff',
                },
            });
            const imageUrl = await this.uploadQRImage(qrImageBuffer, `verify-${hash}.png`);
            const qrCode = this.qrRepository.create({
                hash,
                url,
                imageUrl,
                type: qr_entity_1.QRCodeType.VERIFICATION,
                nftId,
                createdBy,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                metadata: {
                    purpose: 'authenticity_verification',
                    generatedAt: new Date().toISOString(),
                },
            });
            const savedQR = await this.qrRepository.save(qrCode);
            this.logger.log(`Verification QR code generated for NFT ${nftId}: ${savedQR.id}`);
            return savedQR;
        }
        catch (error) {
            this.logger.error(`Failed to generate verification QR code: ${error.message}`);
            throw error;
        }
    }
    async generateTrackingQR(nftId, trackingNumber, createdBy) {
        try {
            const url = `${this.baseUrl}/track/${trackingNumber}`;
            const hash = this.generateHash(url + trackingNumber);
            const qrImageBuffer = await QRCodeGenerator.toBuffer(url, {
                type: 'png',
                width: 256,
                margin: 1,
                color: {
                    dark: '#2d3748',
                    light: '#ffffff',
                },
            });
            const imageUrl = await this.uploadQRImage(qrImageBuffer, `track-${hash}.png`);
            const qrCode = this.qrRepository.create({
                hash,
                url,
                imageUrl,
                type: qr_entity_1.QRCodeType.TRACKING,
                nftId,
                createdBy,
                metadata: {
                    trackingNumber,
                    purpose: 'delivery_tracking',
                    generatedAt: new Date().toISOString(),
                },
            });
            const savedQR = await this.qrRepository.save(qrCode);
            this.logger.log(`Tracking QR code generated for NFT ${nftId}: ${savedQR.id}`);
            return savedQR;
        }
        catch (error) {
            this.logger.error(`Failed to generate tracking QR code: ${error.message}`);
            throw error;
        }
    }
    async scanQR(hash) {
        try {
            const qrCode = await this.qrRepository.findOne({
                where: { hash },
                relations: ['nft', 'creator'],
            });
            if (!qrCode) {
                throw new common_1.NotFoundException('QR code not found');
            }
            const isValid = this.validateQR(qrCode);
            if (isValid) {
                qrCode.scanCount += 1;
                qrCode.lastScannedAt = new Date();
                await this.qrRepository.save(qrCode);
            }
            this.logger.log(`QR code scanned: ${hash} - Valid: ${isValid}`);
            return { qrCode, isValid };
        }
        catch (error) {
            this.logger.error(`QR scan failed: ${error.message}`);
            throw error;
        }
    }
    async findByNFT(nftId) {
        return this.qrRepository.find({
            where: { nftId },
            order: { createdAt: 'DESC' },
            relations: ['nft', 'creator'],
        });
    }
    async findByType(type) {
        return this.qrRepository.find({
            where: { type, isActive: true },
            order: { createdAt: 'DESC' },
            relations: ['nft', 'creator'],
        });
    }
    async deactivateQR(id) {
        const qrCode = await this.qrRepository.findOne({ where: { id } });
        if (!qrCode) {
            throw new common_1.NotFoundException('QR code not found');
        }
        qrCode.isActive = false;
        const deactivatedQR = await this.qrRepository.save(qrCode);
        this.logger.log(`QR code deactivated: ${id}`);
        return deactivatedQR;
    }
    async getQRStats(nftId) {
        const qrCodes = await this.findByNFT(nftId);
        const totalScans = qrCodes.reduce((sum, qr) => sum + qr.scanCount, 0);
        const uniqueQRs = qrCodes.length;
        const activeQRs = qrCodes.filter(qr => qr.isActive).length;
        const lastScanned = qrCodes
            .filter(qr => qr.lastScannedAt)
            .sort((a, b) => b.lastScannedAt.getTime() - a.lastScannedAt.getTime())[0]?.lastScannedAt || null;
        return {
            totalScans,
            uniqueQRs,
            lastScanned,
            activeQRs,
        };
    }
    generateHash(data) {
        return (0, crypto_1.createHash)('sha256').update(data + Date.now().toString()).digest('hex').substring(0, 16);
    }
    validateQR(qrCode) {
        if (!qrCode.isActive) {
            return false;
        }
        if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
            return false;
        }
        return true;
    }
    async uploadQRImage(buffer, fileName) {
        try {
            const mockUrl = `${this.baseUrl}/qr-images/${fileName}`;
            this.logger.log(`QR image would be uploaded: ${fileName}`);
            return mockUrl;
        }
        catch (error) {
            this.logger.error(`QR image upload failed: ${error.message}`);
            throw error;
        }
    }
    async bulkGenerateQRs(nftIds, type, createdBy) {
        try {
            const results = [];
            for (const nftId of nftIds) {
                let qrCode;
                switch (type) {
                    case qr_entity_1.QRCodeType.PRODUCT:
                        qrCode = await this.generateNFTQR(nftId, createdBy);
                        break;
                    case qr_entity_1.QRCodeType.VERIFICATION:
                        qrCode = await this.generateVerificationQR(nftId, createdBy);
                        break;
                    default:
                        throw new Error(`Bulk generation not supported for type: ${type}`);
                }
                results.push(qrCode);
            }
            this.logger.log(`Bulk QR generation completed: ${results.length} codes`);
            return results;
        }
        catch (error) {
            this.logger.error(`Bulk QR generation failed: ${error.message}`);
            throw error;
        }
    }
};
exports.QRService = QRService;
exports.QRService = QRService = QRService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(qr_entity_1.QRCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], QRService);
//# sourceMappingURL=qr.service.js.map