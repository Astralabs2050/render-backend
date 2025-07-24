import { BaseEntity } from '../../common/entities/base.entity';
import { NFT } from './nft.entity';
import { User } from '../../users/entities/user.entity';
export declare enum QRCodeType {
    PRODUCT = "product",
    VERIFICATION = "verification",
    TRACKING = "tracking"
}
export declare class QRCode extends BaseEntity {
    hash: string;
    url: string;
    imageUrl: string;
    type: QRCodeType;
    nft: NFT;
    nftId: string;
    creator: User;
    createdBy: string;
    metadata: Record<string, any>;
    expiresAt: Date;
    isActive: boolean;
    scanCount: number;
    lastScannedAt: Date;
}
