import { Repository } from 'typeorm';
import { QRCode, QRCodeType } from '../entities/qr.entity';
import { ConfigService } from '@nestjs/config';
export interface CreateQRDto {
    nftId: string;
    type: QRCodeType;
    createdBy: string;
    expiresAt?: Date;
    metadata?: Record<string, any>;
}
export declare class QRService {
    private qrRepository;
    private configService;
    private readonly logger;
    private readonly baseUrl;
    constructor(qrRepository: Repository<QRCode>, configService: ConfigService);
    generateNFTQR(nftId: string, createdBy?: string): Promise<QRCode>;
    generateVerificationQR(nftId: string, createdBy: string): Promise<QRCode>;
    generateTrackingQR(nftId: string, trackingNumber: string, createdBy: string): Promise<QRCode>;
    scanQR(hash: string): Promise<{
        qrCode: QRCode;
        isValid: boolean;
    }>;
    findByNFT(nftId: string): Promise<QRCode[]>;
    findByType(type: QRCodeType): Promise<QRCode[]>;
    deactivateQR(id: string): Promise<QRCode>;
    getQRStats(nftId: string): Promise<{
        totalScans: number;
        uniqueQRs: number;
        lastScanned: Date | null;
        activeQRs: number;
    }>;
    private generateHash;
    private validateQR;
    private uploadQRImage;
    bulkGenerateQRs(nftIds: string[], type: QRCodeType, createdBy: string): Promise<QRCode[]>;
}
