import { IsNumber, IsNotEmpty, IsUUID, IsOptional, Min } from 'class-validator';

export class CreateMeasurementsDto {
  @IsUUID()
  @IsNotEmpty()
  chatId: string;

  @IsNumber()
  @Min(0)
  neck: number;

  @IsNumber()
  @Min(0)
  chest: number;

  @IsNumber()
  @Min(0)
  armLeft: number;

  @IsNumber()
  @Min(0)
  armRight: number;

  @IsNumber()
  @Min(0)
  waist: number;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsNumber()
  @Min(0)
  hips: number;

  @IsNumber()
  @Min(0)
  legs: number;

  @IsNumber()
  @Min(0)
  thighLeft: number;

  @IsNumber()
  @Min(0)
  thighRight: number;

  @IsNumber()
  @Min(0)
  calfLeft: number;

  @IsNumber()
  @Min(0)
  calfRight: number;
}

export class UpdateMeasurementsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  neck?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chest?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  armLeft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  armRight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waist?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hips?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  legs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thighLeft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thighRight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calfLeft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calfRight?: number;
}