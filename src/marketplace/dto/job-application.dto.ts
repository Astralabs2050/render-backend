import { IsString, IsOptional, IsArray, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SelectedProject {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class JobApplicationDto {
  @IsArray()
  @IsOptional()
  portfolioLinks?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedProject)
  @IsOptional()
  selectedProjects?: SelectedProject[];

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
