import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { NFT } from './nft.entity';
import { User } from '../../users/entities/user.entity';
export enum QRCodeType {
  PRODUCT = 'product',
  VERIFICATION = 'verification',
  TRACKING = 'tracking',
}
@Entity('qr_codes')
export class QRCode extends BaseEntity {
  @Column()
  hash: string;
  @Column()
  url: string;
  @Column({ nullable: true })
  imageUrl: string;
  @Column({
    type: 'enum',
    enum: QRCodeType,
    default: QRCodeType.PRODUCT,
  })
  type: QRCodeType;
  @ManyToOne(() => NFT, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nftId' })
  nft: NFT;
  @Column()
  nftId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;
  @Column()
  createdBy: string;
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
  @Column({ default: true })
  isActive: boolean;
  @Column({ default: 0 })
  scanCount: number;
  @Column({ type: 'timestamp', nullable: true })
  lastScannedAt: Date;
}