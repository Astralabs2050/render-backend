import { IsString, IsNumber, IsDate, IsEnum } from 'class-validator';
import { NFTStatus } from '../../web3/entities/nft.entity';

export class CreateDesignInventoryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsEnum(NFTStatus)
  publishedStatus: NFTStatus;

  @IsString()
  designLink: string;

  @IsDate()
  lastUpdated: Date;
}
