import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Job } from './entities/job.entity';
import { JobApplication } from './entities/job-application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { DeliveryDetails } from './entities/delivery-details.entity';
import { Measurements } from './entities/measurements.entity';
import { UserDeliveryDetails } from './entities/user-delivery-details.entity';
import { UserMeasurements } from './entities/user-measurements.entity';
import { User } from '../users/entities/user.entity';
import { DesignRecord } from '../designs/entities/design-record.entity';
import { JobController } from './controllers/job.controller';
import { ChatController } from './controllers/chat.controller';
import { JobService } from './services/job.service';
import { ChatService } from './services/chat.service';
import { ChatGateway } from './gateways/chat.gateway';
import { WorkflowService } from './services/workflow.service';
import { NotificationService } from './services/notification.service';
import { MarketplaceService } from './services/marketplace.service';
import { UsersModule } from '../users/users.module';
import { DesignsModule } from '../designs/designs.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobApplication, SavedJob, Chat, Message, DeliveryDetails, Measurements, UserDeliveryDetails, UserMeasurements, User, DesignRecord]),
    forwardRef(() => UsersModule),
    DesignsModule,
    forwardRef(() => NotificationsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [JobController, ChatController],
  providers: [JobService, ChatService, ChatGateway, WorkflowService, NotificationService, MarketplaceService],
  exports: [JobService, ChatService, WorkflowService, NotificationService, MarketplaceService],
})
export class MarketplaceModule {}