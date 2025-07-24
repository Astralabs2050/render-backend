import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export class CreateChatDto {
  @IsString()
  title: string;
}

export class SendMessageDto {
  @IsString()
  content: string;

  @IsUUID()
  chatId: string;

  @IsOptional()
  @IsString()
  imageBase64?: string;
}

export class GenerateImageDto {
  @IsString()
  prompt: string;

  @IsUUID()
  chatId: string;

  @IsUUID()
  messageId: string;

  @IsOptional()
  @IsString()
  referenceImageBase64?: string;

  @IsOptional()
  @IsEnum(['stable-diffusion', 'astria'])
  provider?: 'stable-diffusion' | 'astria' = 'stable-diffusion';
}

export class ExtractMetadataDto {
  @IsUUID()
  imageId: string;

  @IsUUID()
  chatId: string;
}