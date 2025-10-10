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
  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;
  @Column({ name: 'job_id' })
  jobId: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'maker_id' })
  maker: User;
  @Column({ name: 'maker_id' })
  makerId: string;
  @Column('text', { nullable: true })
  proposal: string;
  @Column('text', { nullable: true })
  coverLetter: string;
  @Column('decimal', { precision: 10, scale: 2 })
  proposedBudget: number;
  @Column({ nullable: true })
  estimatedDays: number;
  @Column({ nullable: true })
  proposedTimeline: number;
  @Column('simple-array', { nullable: true })
  portfolioLinks: string[];
  @Column({ nullable: true })
  portfolioUrl: string;
  @Column({ type: 'jsonb', nullable: true })
  selectedProjects: {
    id: string;
    title: string;
    images: string[];
    description: string;
    tags: string[];
  }[];
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;
  @Column('text', { nullable: true })
  message: string; 
  @Column({ nullable: true })
  respondedAt: Date; 
}