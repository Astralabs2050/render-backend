import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Chat } from './chat.entity';

@Entity('measurements')
export class Measurements extends BaseEntity {
  @Column('decimal', { precision: 5, scale: 2 })
  neckCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  chestCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  armLeftCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  armRightCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  waistCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  weightKg: number;

  @Column('decimal', { precision: 5, scale: 2 })
  hipsCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  legsCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  thighLeftCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  thighRightCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  calfLeftCm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  calfRightCm: number;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  chatId: string;
}