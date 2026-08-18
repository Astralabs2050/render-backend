import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { AIChatModule } from './ai-chat/ai-chat.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { VrEmailModule } from './vr-email/vr-email.module';
import { CreditsModule } from './credits/credits.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WalletModule } from './wallet/wallet.module';
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
      ttl: 60000,
      limit: 120, // SPA pages issue many reads; 10/min starved chat
    }]),
    ConfigModule,
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    WaitlistModule,
    AIChatModule,
    MarketplaceModule,
    WalletModule,
    VrEmailModule,
    CreditsModule,
    NotificationsModule,
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