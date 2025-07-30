import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatController } from './controllers/chat.controller';
import { DesignController } from './controllers/design.controller';

import { ChatService } from './services/chat.service';
import { DesignWorkflowService } from './services/design-workflow.service';
import { InteractiveChatService } from './services/interactive-chat.service';
import { PromptService } from './services/prompt.service';
import { OpenAIService } from './services/openai.service';
import { StreamChatService } from './services/stream-chat.service';
import { Chat, ChatMessage } from './entities/chat.entity';
import { Milestone } from './entities/milestone.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { Web3Module } from '../web3/web3.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatMessage, Milestone]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRATION', '7d') },
      }),
    }),
    UsersModule,
    Web3Module,
    forwardRef(() => MarketplaceModule),
    AuthModule,
  ],
  controllers: [ChatController, DesignController],
  providers: [
    ChatService,
    DesignWorkflowService,
    InteractiveChatService,
    PromptService,
    OpenAIService,
    StreamChatService,
  ],
  exports: [ChatService, DesignWorkflowService],
})
export class AIChatModule {}