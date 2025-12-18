import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NotificationService as AppNotificationService } from '../../notifications/services/notification.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(forwardRef(() => AppNotificationService))
    private appNotificationService: AppNotificationService,
  ) {}

  async sendJobNotification(userId: string, message: string): Promise<void> {
    this.logger.log(`Notification sent to ${userId}: ${message}`);
  }

  async notifyMakersOfNewJob(job: any): Promise<void> {
    this.logger.log(`Notifying makers of new job: ${job.id}`);
    // Future: Could notify makers whose skills match the job
  }

  async notifyCreatorOfApplication(application: any): Promise<void> {
    this.logger.log(`Notifying creator of application: ${application.id}`);
    await this.appNotificationService.notifyJobApplication(
      application.job.creatorId,
      application.maker?.fullName || 'A maker',
      application.job,
    );
  }

  async notifyMakerOfAcceptance(application: any): Promise<void> {
    this.logger.log(`Notifying maker of acceptance: ${application.id}`);
    await this.appNotificationService.notifyJobAccepted(
      application.makerId,
      application.job,
    );
  }

  async notifyCreatorOfCompletion(job: any): Promise<void> {
    this.logger.log(`Notifying creator of completion: ${job.id}`);
  }
}