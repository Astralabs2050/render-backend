import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { JobSeeder } from './database/seeders/job.seeder';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { Job } from './marketplace/entities/job.entity';
import { JobApplication } from './marketplace/entities/job-application.entity';
import { User } from './users/entities/user.entity';
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10, // 10 requests per TTL
    }]),
    ConfigModule,
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    WaitlistModule,
    AIChatModule,
    Web3Module,
    MarketplaceModule,
    TypeOrmModule.forFeature([Job, JobApplication, User]),
  ],
  controllers: [AppController],
  providers: [
    JobSeeder,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}