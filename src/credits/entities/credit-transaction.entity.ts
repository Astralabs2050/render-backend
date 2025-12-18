import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  BONUS = 'bonus',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
}

export enum AIActionType {
  DESIGN_GENERATION = 'design_generation',
  DESIGN_VARIATION = 'design_variation',
  DESIGN_REFINEMENT = 'design_refinement',
  METADATA_EXTRACTION = 'metadata_extraction',
}

@Entity('credit_transactions')
@Index(['userId', 'createdAt'])
@Index(['paymentReference'])
export class CreditTransaction extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'int' })
  balanceBefore: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, unique: true })
  paymentReference: string;

  @Column({ type: 'enum', enum: AIActionType, nullable: true })
  aiActionType: AIActionType;

  @Column({ nullable: true })
  chatId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
