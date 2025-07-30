import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QRCode, QRCodeType } from '../entities/qr.entity';
import { ConfigService } from '@nestjs/config';
import * as QRCodeGenerator from 'qrcode';
import { createHash } from 'crypto';
export interface CreateQRDto {
  nftId: string;
  type: QRCodeType;
  createdBy: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}
@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);
  private readonly baseUrl: string;
  constructor(
    @InjectRepository(QRCode)
    private qrRepository: Repository<QRCode>,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://localhost:3000');
  }
  async generateNFTQR(nftId: string, createdBy?: string): Promise<QRCode> {
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
        type: QRCodeType.PRODUCT,
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
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      throw error;
    }
  }
  async generateVerificationQR(nftId: string, createdBy: string): Promise<QRCode> {
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
        type: QRCodeType.VERIFICATION,
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
    } catch (error) {
      this.logger.error(`Failed to generate verification QR code: ${error.message}`);
      throw error;
    }
  }
  async generateTrackingQR(nftId: string, trackingNumber: string, createdBy: string): Promise<QRCode> {
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
        type: QRCodeType.TRACKING,
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
    } catch (error) {
      this.logger.error(`Failed to generate tracking QR code: ${error.message}`);
      throw error;
    }
  }
  async scanQR(hash: string): Promise<{ qrCode: QRCode; isValid: boolean }> {
    try {
      const qrCode = await this.qrRepository.findOne({
        where: { hash },
        relations: ['nft', 'creator'],
      });
      if (!qrCode) {
        throw new NotFoundException('QR code not found');
      }
      const isValid = this.validateQR(qrCode);
      if (isValid) {
        qrCode.scanCount += 1;
        qrCode.lastScannedAt = new Date();
        await this.qrRepository.save(qrCode);
      }
      this.logger.log(`QR code scanned: ${hash} - Valid: ${isValid}`);
      return { qrCode, isValid };
    } catch (error) {
      this.logger.error(`QR scan failed: ${error.message}`);
      throw error;
    }
  }
  async findByNFT(nftId: string): Promise<QRCode[]> {
    return this.qrRepository.find({
      where: { nftId },
      order: { createdAt: 'DESC' },
      relations: ['nft', 'creator'],
    });
  }
  async findByType(type: QRCodeType): Promise<QRCode[]> {
    return this.qrRepository.find({
      where: { type, isActive: true },
      order: { createdAt: 'DESC' },
      relations: ['nft', 'creator'],
    });
  }
  async deactivateQR(id: string): Promise<QRCode> {
    const qrCode = await this.qrRepository.findOne({ where: { id } });
    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }
    qrCode.isActive = false;
    const deactivatedQR = await this.qrRepository.save(qrCode);
    this.logger.log(`QR code deactivated: ${id}`);
    return deactivatedQR;
  }
  async getQRStats(nftId: string): Promise<{
    totalScans: number;
    uniqueQRs: number;
    lastScanned: Date | null;
    activeQRs: number;
  }> {
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
  private generateHash(data: string): string {
    return createHash('sha256').update(data + Date.now().toString()).digest('hex').substring(0, 16);
  }
  private validateQR(qrCode: QRCode): boolean {
    if (!qrCode.isActive) {
      return false;
    }
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return false;
    }
    return true;
  }
  private async uploadQRImage(buffer: Buffer, fileName: string): Promise<string> {
    try {
      const mockUrl = `${this.baseUrl}/qr-images/${fileName}`;
      this.logger.log(`QR image would be uploaded: ${fileName}`);
      return mockUrl;
    } catch (error) {
      this.logger.error(`QR image upload failed: ${error.message}`);
      throw error;
    }
  }
  async bulkGenerateQRs(nftIds: string[], type: QRCodeType, createdBy: string): Promise<QRCode[]> {
    try {
      const results = [];
      for (const nftId of nftIds) {
        let qrCode: QRCode;
        switch (type) {
          case QRCodeType.PRODUCT:
            qrCode = await this.generateNFTQR(nftId, createdBy);
            break;
          case QRCodeType.VERIFICATION:
            qrCode = await this.generateVerificationQR(nftId, createdBy);
            break;
          default:
            throw new Error(`Bulk generation not supported for type: ${type}`);
        }
        results.push(qrCode);
      }
      this.logger.log(`Bulk QR generation completed: ${results.length} codes`);
      return results;
    } catch (error) {
      this.logger.error(`Bulk QR generation failed: ${error.message}`);
      throw error;
    }
  }
}