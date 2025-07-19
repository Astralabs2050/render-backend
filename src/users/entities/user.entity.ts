import { Entity, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { OAuthProvider } from '../../auth/oauth/oauth.entity';

export enum UserType {
  CREATOR = 'creator',
  BRAND = 'brand',
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

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  active: boolean;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  otp: string;

  @Column({ nullable: true })
  otpCreatedAt: Date;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ type: 'enum', enum: UserType, nullable: true })
  userType: UserType;
  
  @OneToMany(() => OAuthProvider, oauthProvider => oauthProvider.user)
  oauthProviders: OAuthProvider[];
}