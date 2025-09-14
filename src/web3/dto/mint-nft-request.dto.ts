import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class MintNFTRequestDto {
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