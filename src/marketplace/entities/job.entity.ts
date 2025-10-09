import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
export enum JobStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed'
}
export enum JobPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
@Entity('jobs')
export class Job extends BaseEntity {
  @Column()
  title: string;
  @Column('text')
  description: string;
  @Column('text', { nullable: true })
  requirements: string;
  @Column('decimal', { precision: 10, scale: 2 })
  budget: number;
  @Column({ default: 'USD' })
  currency: string;
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.OPEN })
  status: JobStatus;
  @Column({ type: 'enum', enum: JobPriority, default: JobPriority.MEDIUM })
  priority: JobPriority;
  @Column({ nullable: true })
  deadline: Date;
  @Column('simple-array', { nullable: true })
  tags: string[];
  @Column('simple-array', { nullable: true })
  referenceImages: string[];
  @Column({ nullable: true })
  chatId: string;
  
  @Column({ nullable: true })
  designId: string; // Link to the NFT design this job is for 
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
  @Column()
  creatorId: string;
  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'makerId' })
  maker: User;
  @Column({ nullable: true })
  makerId: string;
  @Column({ nullable: true })
  acceptedAt: Date;
  @Column({ nullable: true })
  completedAt: Date;
  @Column({ nullable: true })
  escrowContractAddress: string;
  @Column('simple-array', { nullable: true })
  deliverables: string[]; 
  @Column('text', { nullable: true })
  feedback: string;
  @Column({ type: 'int', nullable: true, default: null })
  rating: number;
  @Column('text', { nullable: true })
  aiPrompt: string; // Summarized AI prompt used to create the design
}