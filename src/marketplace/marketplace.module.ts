import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobApplication } from './entities/job-application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { User } from '../users/entities/user.entity';
import { NFT } from '../web3/entities/nft.entity';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { WorkflowService } from './services/workflow.service';
import { NotificationService } from './services/notification.service';
import { UsersModule } from '../users/users.module';
import { Web3Module } from '../web3/web3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobApplication, SavedJob, User, NFT]),
    forwardRef(() => UsersModule),
    Web3Module,
  ],
  controllers: [JobController],
  providers: [JobService, WorkflowService, NotificationService],
  exports: [JobService, WorkflowService, NotificationService],
})
export class MarketplaceModule {}