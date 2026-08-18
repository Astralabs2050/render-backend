import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum WalletTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  HOLD = 'hold',
  RELEASE = 'release',
  WITHDRAWAL = 'withdrawal',
}

@Entity('wallet_transactions')
export class WalletTransaction extends BaseEntity {
  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  chatId: string;

  @Column({ nullable: true })
  escrowId: string;

  @Column({ nullable: true })
  paystackReference: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
