import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
@Entity('oauth_providers')
export class OAuthProvider extends BaseEntity {
  @Column()
  provider: string;
  @Column()
  providerId: string;
  @Column({ nullable: true, type: 'jsonb' })
  profile: Record<string, any>;
  @Column({ nullable: true })
  accessToken: string;
  @Column({ nullable: true })
  refreshToken: string;
  @ManyToOne(() => User, user => user.oauthProviders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column()
  userId: string;
}