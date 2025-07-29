import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
export class UpdateUserDto implements Partial<CreateUserDto> {
  @IsString()
  @IsOptional()
  email?: string;
  @IsString()
  @IsOptional()
  password?: string;
  @IsString()
  @IsOptional()
  fullName?: string;
  @IsString()
  @IsOptional()
  language?: string;
  @IsString()
  @IsOptional()
  otp?: string | null;
  @IsOptional()
  otpCreatedAt?: Date;
  @IsBoolean()
  @IsOptional()
  verified?: boolean;
  @IsString()
  @IsOptional()
  walletAddress?: string;
  @IsString()
  @IsOptional()
  walletPrivateKey?: string;
}