import { IsString, IsNotEmpty } from 'class-validator';

export class PurchaseCreditsDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  reference: string;
}
