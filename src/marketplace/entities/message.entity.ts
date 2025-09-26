import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chat } from './chat.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  DELIVERY_AND_MEASUREMENTS = 'delivery_and_measurements',
  APPLICATION_ACCEPTED = 'applicationAccepted'
}

@Entity('messages')
export class Message extends BaseEntity {
  @Column()
  chatId: string;

  @ManyToOne(() => Chat)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column('simple-array', { nullable: true })
  attachments: string[];

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  actionType: string;

  @Column('jsonb', { nullable: true })
  applicationData: {
    title?: string;
    description?: string;
    timeline?: string;
    amount?: number;
  } | null;
}