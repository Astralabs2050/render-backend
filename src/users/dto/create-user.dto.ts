import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { UserType } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;
  
  @IsString()
  @IsOptional()
  otp?: string;
  
  @IsOptional()
  otpCreatedAt?: Date;

  @IsString()
  @IsOptional()
  walletAddress?: string;

  @IsString()
  @IsOptional()
  walletPrivateKey?: string;
}