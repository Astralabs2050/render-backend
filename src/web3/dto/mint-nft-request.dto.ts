import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class MintNFTRequestDto {
  @IsUUID(4, { message: 'chatId must be a valid UUID' })
  chatId: string;

  @IsString()
  @IsNotEmpty({ message: 'selectedVariation is required' })
  selectedVariation: string;

  @IsString()
  @IsNotEmpty({ message: 'paymentTransactionHash is required' })
  paymentTransactionHash: string;
}