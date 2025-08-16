import { IsString, IsOptional, IsUUID } from 'class-validator';
export class CreateDesignDto {
  @IsString()
  prompt: string;
  @IsOptional()
  @IsString()
  fabricImageBase64?: string;
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