import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class PublishMarketplaceDto {
  @IsUUID()
  @IsNotEmpty()
  designId: string; // The NFT design to publish

  @IsNumber()
  @Min(1)
  @Max(10000)
  pricePerOutfit: number; // Price per individual outfit

  @IsNumber()
  @Min(1)
  @Max(1000)
  quantityAvailable: number;

  @IsString()
  @IsNotEmpty()
  deliveryWindow: string; 

  @IsString()
  @IsOptional()
  brandStory?: string; 

  @IsString()
  @IsNotEmpty()
  regionOfDelivery: string;
}