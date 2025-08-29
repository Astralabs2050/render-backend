import { IsString, IsOptional, IsUUID, IsNumber, IsDate, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum DesignVariety {
  VARIATION_1 = 'variation_1',
  VARIATION_2 = 'variation_2', 
  VARIATION_3 = 'variation_3'
}

export class CreateDesignDto {
  @IsString()
  prompt: string;
  
  @IsOptional()
  @IsString()
  fabricImageBase64?: string;
}

export class ApproveDesignDto {
  @IsUUID()
  chatId: string;
  
  @IsEnum(DesignVariety)
  selectedVariety: DesignVariety;
  
  @IsString()
  @IsOptional()
  designName?: string; // Optional - can override AI suggestion
  
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10000)
  price?: number; // Optional - can override AI suggestion
  
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  collectionQuantity?: number; // Optional - can override AI suggestion
  
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  deadline?: Date; // Optional - can override AI suggestion
  
  @IsString()
  @IsOptional()
  description?: string;
  
  @IsBoolean()
  @IsOptional()
  useAISuggestions?: boolean = true; // Default to using AI suggestions
}

export class SimpleApproveDesignDto {
  @IsUUID()
  chatId: string;
  
  @IsEnum(DesignVariety)
  selectedVariety: DesignVariety;
  
  @IsBoolean()
  useAISuggestions: boolean = true; // Just confirm to use AI suggestions
  
  @IsString()
  @IsOptional()
  customName?: string; // Only if user wants to override AI name
}

export class CreateDesignVariationDto {
  @IsUUID()
  chatId: string;
  
  @IsString()
  prompt: string;
}

export class StoreDesignDto {
  @IsUUID()
  chatId: string;
  
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  @IsString()
  description?: string;
}