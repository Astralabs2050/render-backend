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

  @IsOptional()
  @IsUUID('4', { message: 'designId must be a valid UUID' })
  designId?: string;

  @IsString()
  @IsNotEmpty({ message: 'paymentTransactionHash is required' })
  paymentTransactionHash: string;

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