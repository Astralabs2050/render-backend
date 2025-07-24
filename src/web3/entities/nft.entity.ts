import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../ai-chat/entities/chat.entity';

export enum NFTStatus {
  DRAFT = 'draft',
  MINTING = 'minting',
  MINTED = 'minted',
  LISTED = 'listed',
  SOLD = 'sold',
}

@Entity('nfts')
export class NFT extends BaseEntity {
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

  @Column({
    type: 'enum',
    enum: NFTStatus,
    default: NFTStatus.DRAFT,
  })
  status: NFTStatus;

  @Column({ nullable: true })
  tokenId: string;

  @Column({ nullable: true })
  contractAddress: string;

  @Column({ nullable: true })
  ipfsHash: string;

  @Column({ nullable: true })
  ipfsUrl: string;

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

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ type: 'timestamp', nullable: true })
  mintedAt: Date;
}