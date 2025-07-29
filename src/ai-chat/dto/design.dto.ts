import { IsString, IsOptional, IsUUID } from 'class-validator';
export class CreateDesignDto {
  @IsString()
  prompt: string;
  @IsOptional()
  @IsString()
  fabricImageBase64?: string;
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