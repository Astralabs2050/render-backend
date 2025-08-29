import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsArray, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JobPriority, JobStatus } from '../entities/job.entity';
export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;
  @IsString()
  @IsNotEmpty()
  description: string;
  @IsString()
  @IsOptional()
  requirements?: string;
  @IsNumber()
  @Min(1)
  budget: number;
  @IsString()
  @IsOptional()
  currency?: string = 'USD';
  @IsEnum(JobPriority)
  @IsOptional()
  priority?: JobPriority = JobPriority.MEDIUM;
  @IsDateString()
  @IsOptional()
  deadline?: string;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  referenceImages?: string[];
  @IsString()
  @IsOptional()
  chatId?: string;
}
export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsString()
  @IsOptional()
  requirements?: string;
  @IsNumber()
  @Min(1)
  @IsOptional()
  budget?: number;
  @IsEnum(JobPriority)
  @IsOptional()
  priority?: JobPriority;
  @IsDateString()
  @IsOptional()
  deadline?: string;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  referenceImages?: string[];
}
export class JobApplicationDto {
  @IsString()
  @IsNotEmpty()
  proposal: string;
  @IsNumber()
  @Min(1)
  proposedBudget: number;
  @IsNumber()
  @Min(1)
  @Max(365)
  estimatedDays: number;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  portfolioLinks?: string[];
  @IsString()
  @IsOptional()
  message?: string;
}
export class JobFilterDto {
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
  @IsEnum(JobPriority)
  @IsOptional()
  priority?: JobPriority;
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  minBudget?: number;
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxBudget?: number;
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
  @IsString()
  @IsOptional()
  search?: string;
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  format?: string;
}