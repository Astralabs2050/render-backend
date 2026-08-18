import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { MarketplaceChat } from '../../marketplace/entities/chat.entity';

export enum ProjectEscrowStatus {
  PENDING = 'pending',
  FUNDED = 'funded',
  PARTIALLY_RELEASED = 'partially_released',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPaymentType {
  ONE_TIME = 'one_time',
  MILESTONE = 'milestone',
}

@Entity('project_escrows')
export class ProjectEscrow extends BaseEntity {
  @Index()
  @Column()
  chatId: string;

  @ManyToOne(() => MarketplaceChat)
  @JoinColumn({ name: 'chatId' })
  chat: MarketplaceChat;

  @Column()
  brandId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'brandId' })
  brand: User;

  @Column()
  makerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'makerId' })
  maker: User;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  fundedAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  releasedAmount: number;

  @Column({ type: 'enum', enum: ProjectEscrowStatus, default: ProjectEscrowStatus.PENDING })
  status: ProjectEscrowStatus;

  @Column({ type: 'enum', enum: ProjectPaymentType, default: ProjectPaymentType.MILESTONE })
  paymentType: ProjectPaymentType;

  @Index({ unique: true })
  @Column({ nullable: true })
  paystackReference: string;

  @Column({ default: 'NGN' })
  currency: string;

  @OneToMany(() => EscrowMilestoneItem, (m) => m.escrow, { cascade: true })
  milestones: EscrowMilestoneItem[];
}

export enum MilestoneItemStatus {
  PENDING = 'pending',
  RELEASED = 'released',
}

@Entity('project_escrow_milestones')
export class EscrowMilestoneItem extends BaseEntity {
  @Column()
  escrowId: string;

  @ManyToOne(() => ProjectEscrow, (e) => e.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'escrowId' })
  escrow: ProjectEscrow;

  @Column()
  label: string;

  @Column({ type: 'int' })
  orderIndex: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percent: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: MilestoneItemStatus, default: MilestoneItemStatus.PENDING })
  status: MilestoneItemStatus;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date;
}
