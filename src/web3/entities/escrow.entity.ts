import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../ai-chat/entities/chat.entity';
import { NFT } from './nft.entity';

export enum EscrowStatus {
  CREATED = 'created',
  FUNDED = 'funded',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  DISPUTED = 'disputed',
}

@Entity('escrow_contracts')
export class EscrowContract extends BaseEntity {
  @Column()
  contractAddress: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.CREATED,
  })
  status: EscrowStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column()
  creatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'makerId' })
  maker: User;

  @Column()
  makerId: string;

  @ManyToOne(() => NFT, { nullable: true })
  @JoinColumn({ name: 'nftId' })
  nft: NFT;

  @Column({ nullable: true })
  nftId: string;

  @ManyToOne(() => Chat, { nullable: true })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column({ nullable: true })
  chatId: string;

  @OneToMany(() => EscrowMilestone, milestone => milestone.escrow, { cascade: true })
  milestones: EscrowMilestone[];

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ type: 'timestamp', nullable: true })
  fundedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}

@Entity('escrow_milestones')
export class EscrowMilestone extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column()
  order: number;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @ManyToOne(() => EscrowContract, escrow => escrow.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'escrowId' })
  escrow: EscrowContract;

  @Column()
  escrowId: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}