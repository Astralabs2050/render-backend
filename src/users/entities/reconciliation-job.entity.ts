import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reconciliation_jobs')
export class ReconciliationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  collectionId: string;

  @Column()
  transactionHash: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: string;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;
}