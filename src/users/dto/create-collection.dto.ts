import { IsString, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  collectionName: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsPositive()
  pricePerOutfit: number;

  @IsString()
  @IsNotEmpty()
  deliveryTimeLead: string; 

  @IsString()
  @IsNotEmpty()
  deliveryRegion: string;
}