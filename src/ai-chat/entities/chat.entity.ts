import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
// import { DeliveryDetails } from './delivery-details.entity';
// import { Measurements } from './measurements.entity';
export enum UserType {
  CREATOR = 'creator',
  MAKER = 'maker',
}
export enum ChatState {
  WELCOME = 'welcome',
  INTENT = 'intent',
  INFO_GATHER = 'info_gather',
  DESIGN_PREVIEW = 'design_preview',
  DESIGN_APPROVED = 'design_approved',
  JOB_INFO_GATHER = 'job_info_gather',
  PAYMENT_REQUIRED = 'payment_required',
  LISTED = 'listed',
  MAKER_PROPOSAL = 'maker_proposal',
  ESCROW_PAYMENT = 'escrow_payment',
  FABRIC_SHIPPING = 'fabric_shipping',
  SAMPLE_REVIEW = 'sample_review',
  FINAL_REVIEW = 'final_review',
  DELIVERY = 'delivery',
  COMPLETED = 'completed',
}
@Entity('ai_chats')
export class Chat extends BaseEntity {
  @Column()
  title: string;
  @Column({
    type: 'enum',
    enum: ChatState,
    default: ChatState.WELCOME,
  })
  state: ChatState;
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column()
  userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
  @Column({ nullable: true })
  creatorId: string;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'makerId' })
  maker: User;
  @Column({ nullable: true })
  makerId: string;
  @OneToMany(() => ChatMessage, message => message.chat, { cascade: true })
  messages: ChatMessage[];
  @Column('simple-array', { nullable: true })
  designPreviews: string[];
  @Column({ nullable: true })
  jobId: string;
  @Column({ nullable: true })
  escrowId: string;
  @Column({ nullable: true })
  nftId: string;

  // @OneToMany(() => DeliveryDetails, deliveryDetails => deliveryDetails.chat)
  // deliveryDetails: DeliveryDetails[];

  // @OneToMany(() => Measurements, measurements => measurements.chat)
  // measurements: Measurements[];
}
@Entity('ai_chat_messages')
export class ChatMessage extends BaseEntity {
  @Column({ type: 'text' })
  content: string;
  @Column()
  role: 'user' | 'assistant' | 'system';
  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;
  @ManyToOne(() => Chat, chat => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;
  @Column()
  chatId: string;
  @Column({ nullable: true })
  imageUrl: string;
  @Column({ nullable: true })
  actionType: string;
}