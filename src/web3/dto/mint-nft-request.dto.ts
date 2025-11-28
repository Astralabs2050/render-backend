import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class MintNFTRequestDto {
  @IsOptional()
  @Transform(({ value }) => value?.replace(/^chat-/, ''))
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsString()
  selectedVariation?: string;

  @Transform(({ obj }) => {
    // Handle different field name variations from frontend
    const id = obj.designId || obj.design_id || obj.nftId || obj.id;
    return id;
  })
  @IsOptional()
  @IsUUID('4', { message: 'designId must be a valid UUID. Received value does not match UUID format.' })
  designId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'paymentTransactionHash cannot be empty if provided' })
  paymentTransactionHash?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  quantity?: number;

  @IsOptional()
  @IsString()
  recipientAddress?: string;
}