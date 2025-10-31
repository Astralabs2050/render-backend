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

  // Note: At least one of jobId or designId must be provided
  // Validation for mutual exclusion and "at least one required" is handled in the controller
  // jobId: for maker hiring workflow (chat about a job)
  // designId: for marketplace shopping workflow (chat about a listed NFT/design)
}
