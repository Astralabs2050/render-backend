import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class JobApplicationDto {
  @IsArray()
  @IsOptional()
  portfolioLinks?: string[];

  @IsOptional()
  selectedProjects?: any; // Accept any structure for selectedProjects

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
