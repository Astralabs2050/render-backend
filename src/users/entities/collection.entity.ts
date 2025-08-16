import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('designs')
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creatorId: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column()
  amountOfPieces: number;

  @Column()
  location: string;

  @Column()
  deadline: string;

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