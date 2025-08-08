import { IsString, IsOptional, IsUUID, IsEnum, IsObject, IsNumber } from 'class-validator';
import { ChatState } from '../entities/chat.entity';
export class CreateChatDto {
  @IsString()
  @IsOptional()
  title?: string;
  @IsString()
  @IsOptional()
  description?: string;
}
export class SendMessageDto {
  @IsString()
  content: string;
  @IsUUID()
  @IsOptional()
  chatId?: string;
  @IsOptional()
  @IsString()
  imageBase64?: string;
  @IsOptional()
  @IsString()
  sketchData?: string;
  @IsOptional()
  @IsString()
  actionType?: string;
}
export class GenerateDesignDto {
  @IsUUID()
  chatId: string;
  @IsString()
  prompt: string;
  @IsOptional()
  @IsString()
  referenceImageBase64?: string;
}
export class ListDesignDto {
  @IsUUID()
  chatId: string;
  @IsString()
  name: string;
  @IsString()
  category: string;
  @IsNumber()
  price: number;
  @IsNumber()
  timeframe: number;
}
export class MakerProposalDto {
  @IsUUID()
  chatId: string;
  @IsUUID()
  makerId: string;
  @IsNumber()
  price: number;
  @IsNumber()
  timeframe: number;
  @IsOptional()
  @IsString()
  portfolio?: string;
}
export class EscrowActionDto {
  @IsUUID()
  chatId: string;
  @IsString()
  action: 'init' | 'unlock' | 'dispute';
  @IsOptional()
  @IsString()
  milestoneId?: string;
}