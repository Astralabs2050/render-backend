import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CollectionPaymentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['wallet'])
  paymentMethod: 'wallet';
}