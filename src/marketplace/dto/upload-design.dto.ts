import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class UploadDesignDto {
  @IsString()
  @IsNotEmpty({ message: 'Design name is required' })
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Design description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;
}
