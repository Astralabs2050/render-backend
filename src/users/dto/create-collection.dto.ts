import { IsString, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDesignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsPositive()
  price: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  amountOfPieces: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  deadline: string;
}