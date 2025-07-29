import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Job } from './job.entity';
export enum ApplicationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}
@Entity('job_applications')
export class JobApplication extends BaseEntity {
  @ManyToOne(() => Job, { eager: true })
  @JoinColumn({ name: 'jobId' })
  job: Job;
  @Column()
  jobId: string;
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'makerId' })
  maker: User;
  @Column()
  makerId: string;
  @Column('text')
  proposal: string;
  @Column('decimal', { precision: 10, scale: 2 })
  proposedBudget: number;
  @Column()
  estimatedDays: number;
  @Column('simple-array', { nullable: true })
  portfolioLinks: string[];
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;
  @Column('text', { nullable: true })
  message: string; 
  @Column({ nullable: true })
  respondedAt: Date; 
}