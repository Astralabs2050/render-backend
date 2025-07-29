import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { AIChatModule } from './ai-chat/ai-chat.module';
import { Web3Module } from './web3/web3.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AppController } from './app.controller';
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    WaitlistModule,
    AIChatModule,
    Web3Module,
    MarketplaceModule,
  ],
  controllers: [AppController],
})
export class AppModule {}