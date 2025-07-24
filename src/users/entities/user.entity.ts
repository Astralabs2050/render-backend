import { Entity, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { OAuthProvider } from '../../auth/oauth/oauth.entity';

export enum UserType {
  CREATOR = 'creator',
  MAKER = 'maker',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  otp: string;

  @Column({ nullable: true })
  otpCreatedAt: Date;

  @Column({ type: 'enum', enum: UserType, nullable: true })
  userType: UserType;
  
  @OneToMany(() => OAuthProvider, oauthProvider => oauthProvider.user)
  oauthProviders: OAuthProvider[];
}