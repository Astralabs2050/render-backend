import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Job } from './job.entity';

@Entity('saved_jobs')
export class SavedJob extends BaseEntity {
  @ManyToOne(() => Job, { eager: true })
  @JoinColumn({ name: 'job_id' })
  job: Job;
  
  @Column({ name: 'job_id' })
  jobId: string;
  
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'maker_id' })
  maker: User;
  
  @Column({ name: 'maker_id' })
  makerId: string;
  
  @CreateDateColumn({ name: 'saved_at' })
  savedAt: Date;
}
