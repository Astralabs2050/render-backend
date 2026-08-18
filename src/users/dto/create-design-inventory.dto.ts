import { IsString, IsNumber, IsDate, IsEnum } from 'class-validator';
import { DesignStatus } from '../../designs/entities/design-record.entity';

export class CreateDesignInventoryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsEnum(DesignStatus)
  publishedStatus: DesignStatus;

  @IsString()
  designLink: string;

  @IsDate()
  lastUpdated: Date;
}
