import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class MintNFTRequestDto {
  @Transform(({ value }) => value?.replace(/^chat-/, ''))
  @IsString()
  @IsNotEmpty({ message: 'chatId is required' })
  chatId: string;

  @IsString()
  @IsNotEmpty({ message: 'selectedVariation is required' })
  selectedVariation: string;

  @IsString()
  @IsNotEmpty({ message: 'paymentTransactionHash is required' })
  paymentTransactionHash: string;
}