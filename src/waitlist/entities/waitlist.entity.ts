import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
@Entity('waitlist')
export class Waitlist extends BaseEntity {
  @Column()
  fullName: string;
  @Column({ unique: true })
  email: string;
  @Column({ nullable: true })
  phoneNumber: string;
  @Column({ name: 'what_you_make', nullable: true })
  whatYouMake: string;
  @Column({ nullable: true })
  website: string;
  @Column({ nullable: true })
  location: string;
  @Column({ default: false })
  approved: boolean;
  @Column({ default: false })
  invited: boolean;
}