import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { ChatService } from './chat/chat.service';
import { ImageGenerationService } from './image-generation/image-generation.service';
import { MetadataExtractionService } from './metadata-extraction/metadata-extraction.service';
import { AiChat, AiChatMessage } from './entities/chat.entity';
import { AiGeneratedImage } from './entities/image-generation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiChat, AiChatMessage, AiGeneratedImage]),
  ],
  controllers: [AiController],
  providers: [
    ChatService,
    ImageGenerationService,
    MetadataExtractionService,
  ],
})
export class AiModule {}