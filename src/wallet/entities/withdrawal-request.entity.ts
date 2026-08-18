import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum WithdrawalStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REJECTED = 'rejected',
}

@Entity('withdrawal_requests')
export class WithdrawalRequest extends BaseEntity {
  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column()
  bankName: string;

  @Column()
  accountNumber: string;

  @Column()
  accountName: string;

  @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus;

  @Column({ type: 'text', nullable: true })
  adminNote: string;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date;
}
