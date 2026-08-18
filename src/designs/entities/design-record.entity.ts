import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../ai-chat/entities/chat.entity';

export enum DesignStatus {
  DRAFT = 'draft',
  SAVING = 'minting',
  READY = 'minted',
  PUBLISHED = 'published',
  LISTED = 'listed',
  HIRED = 'hired',
  SOLD = 'sold',
}

/** Catalog row for a creator design. Table name is historical (`nfts`). */
@Entity('nfts')
export class DesignRecord extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  designLink: string;

  @Column({ nullable: true })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: DesignStatus,
    default: DesignStatus.DRAFT,
  })
  status: DesignStatus;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column()
  creatorId: string;

  @ManyToOne(() => Chat, { nullable: true })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column({ nullable: true })
  chatId: string;

  @Column({ type: 'timestamp', nullable: true })
  mintedAt: Date;
}
