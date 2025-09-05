import { IsOptional, IsString, IsNumber, Min, Max, IsEnum, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FashionCategory } from '../../common/enums/category.enum';

export enum SortBy {
  PRICE_LOW_TO_HIGH = 'price_asc',
  PRICE_HIGH_TO_LOW = 'price_desc',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME_A_TO_Z = 'name_asc',
  NAME_Z_TO_A = 'name_desc',
}

export class MarketplaceFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by name or description

  @IsOptional()
  @IsEnum(FashionCategory)
  category?: FashionCategory; // Filter by category

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim());
    }
    return value;
  })
  creators?: string[]; // Filter by creator IDs

  @IsOptional()
  @IsString()
  region?: string; // Filter by delivery region

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}