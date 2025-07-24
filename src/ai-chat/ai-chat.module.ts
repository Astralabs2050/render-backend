import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { PromptService } from './services/prompt.service';
import { OpenAIService } from './services/openai.service';
import { StreamChatService } from './services/stream-chat.service';
import { Chat, ChatMessage } from './entities/chat.entity';
import { Milestone } from './entities/milestone.entity';
import { UsersModule } from '../users/users.module';
import { Web3Module } from '../web3/web3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatMessage, Milestone]),
    UsersModule,
    Web3Module,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    PromptService,
    OpenAIService,
    StreamChatService,
  ],
  exports: [ChatService],
})
export class AIChatModule {}