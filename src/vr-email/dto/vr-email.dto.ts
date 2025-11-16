import { IsEmail, IsNotEmpty } from 'class-validator';

export class InsertVrEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
