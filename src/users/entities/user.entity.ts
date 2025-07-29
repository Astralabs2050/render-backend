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
  @Column({ nullable: true })
  walletAddress: string;
  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  walletPrivateKey: string;
  @Column({ nullable: true })
  location: string;
  @Column({ nullable: true })
  category: string;
  @Column('simple-array', { nullable: true })
  skills: string[];
  @Column({ default: false })
  profileCompleted: boolean;
  @Column('simple-array', { nullable: true })
  governmentIdImages: string[];
  @Column({ nullable: true })
  nameOnId: string;
  @Column({ nullable: true })
  idCountryOfIssue: string;
  @Column({ nullable: true })
  idExpiryDate: Date;
  @Column({ nullable: true })
  businessCertificateImage: string;
  @Column({ nullable: true })
  businessName: string;
  @Column({ nullable: true })
  businessCountryOfRegistration: string;
  @Column({ nullable: true })
  businessType: string;
  @Column({ nullable: true })
  taxRegistrationNumber: string;
  @Column({ default: false })
  identityVerified: boolean;
  @Column({ type: 'jsonb', nullable: true })
  workExperience: {
    employerName: string;
    jobTitle: string;
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    jobDescription: string;
  }[];
  @Column({ type: 'jsonb', nullable: true })
  projects: {
    title: string;
    images: string[];
    description: string;
    tags: string[];
  }[];
  @OneToMany(() => OAuthProvider, oauthProvider => oauthProvider.user)
  oauthProviders: OAuthProvider[];
}