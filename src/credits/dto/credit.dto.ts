import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class PurchaseCreditsDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  callbackUrl?: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  reference: string;
}
