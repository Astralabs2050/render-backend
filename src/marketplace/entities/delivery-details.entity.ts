import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Chat } from './chat.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled'
}

@Entity('delivery_details')
export class DeliveryDetails extends BaseEntity {
  @Column()
  chatId: string;

  @ManyToOne(() => Chat)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  country: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column('text')
  address: string;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;
}