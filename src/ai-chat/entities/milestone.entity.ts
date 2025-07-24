import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Chat } from './chat.entity';

export enum MilestoneStatus {
  PENDING = 'pending',
  UNLOCKED = 'unlocked',
  COMPLETED = 'completed',
}

@Entity('ai_milestones')
export class Milestone extends BaseEntity {
  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  dueDate: Date;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  chatId: string;

  @Column()
  order: number;
}