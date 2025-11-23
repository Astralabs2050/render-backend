import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { MeasurementColumn } from '../../common/decorators/measurement.decorator';

@Entity('user_measurements')
export class UserMeasurements extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

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
