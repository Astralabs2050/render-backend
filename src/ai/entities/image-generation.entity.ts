import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AiChatMessage } from './chat.entity';

@Entity('ai_generated_images')
export class AiGeneratedImage extends BaseEntity {
  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true, type: 'jsonb' })
  generationParams: Record<string, any>;

  @Column({ nullable: true, type: 'jsonb' })
  metadata: Record<string, any>;

  @ManyToOne(() => AiChatMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: AiChatMessage;

  @Column()
  messageId: string;

  @Column({ default: false })
  isSelected: boolean;
}