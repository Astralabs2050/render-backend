import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Chat } from './chat.entity';
import { MeasurementColumn } from '../../common/decorators/measurement.decorator';

@Entity('measurements')
export class Measurements extends BaseEntity {
  @Column()
  chatId: string;

  @ManyToOne(() => Chat)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

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
}