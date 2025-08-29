import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobApplication } from './entities/job-application.entity';
import { User } from '../users/entities/user.entity';
import { JobService } from './services/job.service';
import { NotificationService } from './services/notification.service';
import { WorkflowService } from './services/workflow.service';
import { JobController } from './controllers/job.controller';
import { forwardRef } from '@nestjs/common';
import { AIChatModule } from '../ai-chat/ai-chat.module';
import { NFT } from '../web3/entities/nft.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobApplication, User, NFT]),
    forwardRef(() => AIChatModule),
  ],
  controllers: [JobController],
  providers: [JobService, NotificationService, WorkflowService],
  exports: [JobService, NotificationService, WorkflowService],
})
export class MarketplaceModule {}