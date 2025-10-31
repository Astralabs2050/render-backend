import { IsString, IsOptional, IsEnum, IsNumber, IsPositive, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '../entities/delivery-details.entity';
import { MessageType } from '../entities/message.entity';

export class DeliveryDetailsDto {
  @IsString()
  country: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;
}

export class MeasurementsDto {
  @IsNumber()
  @IsPositive()
  neck: number;

  @IsNumber()
  @IsPositive()
  chest: number;

  @IsNumber()
  @IsPositive()
  armLeft: number;

  @IsNumber()
  @IsPositive()
  armRight: number;

  @IsNumber()
  @IsPositive()
  waist: number;

  @IsNumber()
  @IsPositive()
  weight: number;

  @IsNumber()
  @IsPositive()
  hips: number;

  @IsNumber()
  @IsPositive()
  legs: number;

  @IsNumber()
  @IsPositive()
  thighLeft: number;

  @IsNumber()
  @IsPositive()
  thighRight: number;

  @IsNumber()
  @IsPositive()
  calfLeft: number;

  @IsNumber()
  @IsPositive()
  calfRight: number;
}

export class ApplicationAcceptedDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  timeline: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}

export class SendMessageWithDetailsDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number; 

  @IsOptional()
  deliveryDetails?: DeliveryDetailsDto;

  @IsOptional()
  measurements?: MeasurementsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicationAcceptedDto)
  applicationData?: ApplicationAcceptedDto;

  @IsOptional()
  @IsUUID()
  designId?: string; 

  @IsOptional()
  @IsString()
  title?: string; }

