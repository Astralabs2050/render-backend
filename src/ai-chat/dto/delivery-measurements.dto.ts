import { IsString, IsEnum, IsUUID, IsNumber, IsPositive, Min, Max } from 'class-validator';
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
}

export class UpdateDeliveryStatusDto {
  @IsUUID()
  chatId: string;

  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;
}

export class CreateMeasurementsDto {
  @IsUUID()
  chatId: string;

  @IsNumber()
  @IsPositive()
  @Min(10)
  @Max(100)
  neckCm: number;

  @IsNumber()
  @IsPositive()
  @Min(50)
  @Max(200)
  chestCm: number;

  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(100)
  armLeftCm: number;

  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(100)
  armRightCm: number;

  @IsNumber()
  @IsPositive()
  @Min(40)
  @Max(200)
  waistCm: number;

  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(300)
  weightKg: number;

  @IsNumber()
  @IsPositive()
  @Min(50)
  @Max(200)
  hipsCm: number;

  @IsNumber()
  @IsPositive()
  @Min(50)
  @Max(150)
  legsCm: number;

  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(100)
  thighLeftCm: number;

  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(100)
  thighRightCm: number;

  @IsNumber()
  @IsPositive()
  @Min(20)
  @Max(80)
  calfLeftCm: number;

  @IsNumber()
  @IsPositive()
  @Min(20)
  @Max(80)
  calfRightCm: number;
}