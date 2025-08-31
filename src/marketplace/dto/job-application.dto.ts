import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class JobApplicationDto {
  @IsArray()
  @IsOptional()
  portfolioLinks?: string[];

  @IsArray()
  @IsOptional()
  selectedProjects?: string[]; // Previous works on platform

  @IsNumber()
  @Min(0)
  proposedAmount: number;

  @IsNumber()
  @Min(0)
  minimumNegotiableAmount: number;

  @IsString()
  @IsOptional()
  timeline?: string;
}
