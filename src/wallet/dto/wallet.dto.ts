import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectPaymentType } from '../entities/project-escrow.entity';
import { WithdrawalStatus } from '../entities/withdrawal-request.entity';

export class MilestoneScheduleDto {
  @IsString()
  label: string;

  @IsNumber()
  @Min(0)
  percent: number;
}

export class InitializeEscrowDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(ProjectPaymentType)
  paymentType: ProjectPaymentType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneScheduleDto)
  milestones?: MilestoneScheduleDto[];

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export class VerifyEscrowDto {
  @IsString()
  reference: string;
}

export class ReleaseEscrowDto {
  @IsOptional()
  @IsString()
  milestoneId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  accountName?: string;
}

export class UpdatePayoutSettingsDto {
  @IsString()
  @MinLength(2)
  bankName: string;

  @IsString()
  @MinLength(8)
  accountNumber: string;

  @IsString()
  @MinLength(2)
  accountName: string;
}

export class UpdateWithdrawalDto {
  @IsEnum(WithdrawalStatus)
  status: WithdrawalStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
