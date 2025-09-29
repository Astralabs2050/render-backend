import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DeliveryStatus } from '../entities/delivery-details.entity';

export class CreateDeliveryDetailsDto {
  @IsUUID()
  chatId: string;

  @IsString()
  country: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;
}

export class UpdateDeliveryDetailsDto {
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;
}