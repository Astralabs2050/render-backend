import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_wallets')
export class UserWallet extends BaseEntity {
  @Index({ unique: true })
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  pendingWithdrawal: number;

  @Column({ default: 'NGN' })
  currency: string;
}
