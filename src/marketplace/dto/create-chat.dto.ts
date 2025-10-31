import { IsUUID, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsUUID()
  designId?: string;
}
