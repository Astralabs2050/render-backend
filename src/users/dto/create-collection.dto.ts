import { IsString, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  collectionName: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @Transform(({ value }) => value.toString())
  @IsString()
  @IsNotEmpty()
  pricePerOutfit: string;

  @IsString()
  @IsNotEmpty()
  deliveryTimeLead: string; 

  @IsString()
  @IsNotEmpty()
  deliveryRegion: string;
}