import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendJobNotification(userId: string, message: string): Promise<void> {
    this.logger.log(`Notification sent to ${userId}: ${message}`);
  }

  async notifyMakersOfNewJob(job: any): Promise<void> {
    this.logger.log(`Notifying makers of new job: ${job.id}`);
  }

  async notifyCreatorOfApplication(application: any): Promise<void> {
    this.logger.log(`Notifying creator of application: ${application.id}`);
  }

  async notifyMakerOfAcceptance(application: any): Promise<void> {
    this.logger.log(`Notifying maker of acceptance: ${application.id}`);
  }

  async notifyCreatorOfCompletion(job: any): Promise<void> {
    this.logger.log(`Notifying creator of completion: ${job.id}`);
  }
}