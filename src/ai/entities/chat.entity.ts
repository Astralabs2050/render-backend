import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ai_chats')
export class AiChat extends BaseEntity {
  @Column()
  title: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => AiChatMessage, message => message.chat, { cascade: true })
  messages: AiChatMessage[];
}

@Entity('ai_chat_messages')
export class AiChatMessage extends BaseEntity {
  @Column({ type: 'text' })
  content: string;

  @Column()
  role: 'user' | 'assistant';

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;

  @ManyToOne(() => AiChat, chat => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: AiChat;

  @Column()
  chatId: string;

  @Column({ nullable: true })
  imageUrl: string;
}