import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('vr_emails')
export class VrEmail extends BaseEntity {
  @Column({ unique: true })
  email: string;
}
