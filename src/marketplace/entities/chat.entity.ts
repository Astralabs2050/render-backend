import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Job } from './job.entity';

@Entity('chats')
export class Chat extends BaseEntity {
  @Column()
  jobId: string;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column()
  creatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column()
  makerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'makerId' })
  maker: User;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  escrowId: string;

  @Column({ nullable: true })
  escrowContractAddress: string;

  @Column({ type: 'enum', enum: ['none', 'pending', 'funded', 'completed', 'disputed'], default: 'none' })
  escrowStatus: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  escrowAmount: number;
}