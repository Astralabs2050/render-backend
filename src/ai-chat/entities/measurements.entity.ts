import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Chat } from './chat.entity';
import { MeasurementColumn } from '../../common/decorators/measurement.decorator';

@Entity('measurements')
export class Measurements {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chatId: string;

  @MeasurementColumn()
  neck: number;

  @MeasurementColumn()
  chest: number;

  @MeasurementColumn()
  armLeft: number;

  @MeasurementColumn()
  armRight: number;

  @MeasurementColumn()
  waist: number;

  @MeasurementColumn()
  weight: number;

  @MeasurementColumn()
  hips: number;

  @MeasurementColumn()
  legs: number;

  @MeasurementColumn()
  thighLeft: number;

  @MeasurementColumn()
  thighRight: number;

  @MeasurementColumn()
  calfLeft: number;

  @MeasurementColumn()
  calfRight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Chat, chat => chat.measurements)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;
}