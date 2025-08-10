import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('collections')
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creatorId: string;

  @Column()
  collectionName: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2 })
  pricePerOutfit: string;

  @Column('decimal', { precision: 15, scale: 2 })
  totalPrice: string;

  @Column()
  deliveryTimeLead: string;

  @Column()
  deliveryRegion: string;

  @Column('text', { array: true })
  designImages: string[];

  @Column({ default: 'pending_payment' })
  status: string;

  @Column({ nullable: true })
  paymentTransactionHash: string;

  @Column({ type: 'jsonb', nullable: true })
  blockchainMetadata: {
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    confirmations?: number;
    timestamp?: string;
    reconciledAt?: string;
  };

  @Column({ nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}