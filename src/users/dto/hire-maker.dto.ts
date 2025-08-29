import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsArray, IsDate, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export class BudgetRangeDto {
  @IsNumber()
  @Min(1)
  min: number;

  @IsNumber()
  @Min(1)
  max: number;
}

export class HireMakerDto {
  @IsUUID()
  @IsNotEmpty()
  designId: string; // The NFT design they want to hire a maker for

  @IsString()
  @IsOptional()
  requirements?: string; // Detailed requirements for the maker

  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number; // How many pieces to produce

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  deadlineDate: Date; // When the project needs to be completed

  @IsString()
  @IsNotEmpty()
  productTimeline: string; // Expected timeline for production

  @IsNotEmpty()
  budgetRange: BudgetRangeDto; // Budget range with min/max values

  @IsString()
  @IsNotEmpty()
  shippingRegion: string; // Where the products need to be shipped

  @IsString()
  @IsNotEmpty()
  fabricSource: string; // Preferred fabric source or requirements

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  skillKeywords: string[]; // Required skills (e.g., ['sewing', 'pattern-making', 'embroidery'])

  @IsEnum(ExperienceLevel)
  @IsNotEmpty()
  experienceLevel: ExperienceLevel; // Required experience level
} 
