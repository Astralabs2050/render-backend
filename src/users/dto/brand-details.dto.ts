import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class BrandDetailsDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Small', 'Medium', 'Large'])
  measurement: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  outfitGender: string; // stored as style size (XS–XXL)

  // Legacy optional fields kept for older clients
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  brandOrigin?: string;

  @IsOptional()
  @IsString()
  brandStory?: string;
}
