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
  APPLICATION_ACCEPTED = 'applicationAccepted',
  DESIGN_INQUIRY = 'design_inquiry' // For marketplace design inquiries with image + caption
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

  @Column('text', { nullable: true, default: null })
  content: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column('simple-array', { nullable: true })
  attachments: string[];

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  actionType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number; // For price negotiations or offers (e.g., "I'll pay $50 for this")

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number; // For escrow release amounts

  @Column('jsonb', { nullable: true })
  applicationData: {
    title?: string;
    description?: string;
    timeline?: string;
    amount?: number;
  } | null;

  @Column({ nullable: true })
  designId: string; // References the NFT/design being discussed (for DESIGN_INQUIRY type)

  @Column({ nullable: true })
  title: string; // Design name/title (for DESIGN_INQUIRY type - from marketplace designs)
}