import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Job } from './job.entity';
import { DeliveryDetails } from './delivery-details.entity';
import { Measurements } from './measurements.entity';

@Entity('chats')
export class Chat extends BaseEntity {
  @Column({ nullable: true })
  jobId: string;

  @ManyToOne(() => Job, { nullable: true })
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
  designId: string;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  escrowId: string;

  @Column({ nullable: true })
  escrowContractAddress: string;

  @Column({ nullable: true })
  escrowTokenId: string; // Thirdweb-generated tokenId for the escrow

  @Column({ type: 'enum', enum: ['none', 'pending', 'funded', 'completed', 'disputed'], default: 'none' })
  escrowStatus: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  escrowAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  releasedAmount: number;

  @OneToMany(() => DeliveryDetails, deliveryDetails => deliveryDetails.chat)
  deliveryDetails: DeliveryDetails[];

  @OneToMany(() => Measurements, measurements => measurements.chat)
  measurements: Measurements[];
}