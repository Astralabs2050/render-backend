import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BrandDetailsDto {
  @IsString()
  @IsNotEmpty()
  brandName: string;

  @IsString()
  @IsNotEmpty()
  brandOrigin: string;

  @IsOptional()
  @IsString()
  brandStory?: string;

  @IsOptional()
  @IsString()
  brandLogo?: string;
}