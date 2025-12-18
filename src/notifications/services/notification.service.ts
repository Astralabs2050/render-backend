import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from '../entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../common/services/email.service';
import { NotificationGateway } from '../gateways/notification.gateway';

interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Types that should send email
  private readonly emailNotificationTypes = [
    NotificationType.CREDITS_FINISHED,
    NotificationType.CREDITS_LOW,
    NotificationType.JOB_ACCEPTED,
    NotificationType.ESCROW_RELEASED,
  ];

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    private notificationGateway: NotificationGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      priority: dto.priority || NotificationPriority.NORMAL,
      actionUrl: dto.actionUrl,
      metadata: dto.metadata,
    });

    const saved = await this.notificationRepository.save(notification);

    // Send real-time notification via WebSocket
    this.notificationGateway.sendToUser(dto.userId, {
      type: 'notification',
      data: saved,
    });

    // Send email for critical notifications
    const shouldSendEmail = dto.sendEmail ?? this.emailNotificationTypes.includes(dto.type);
    if (shouldSendEmail) {
      await this.sendEmailNotification(dto.userId, saved);
    }

    this.logger.log(`Notification created for user ${dto.userId}: ${dto.type}`);
    return saved;
  }

  private async sendEmailNotification(userId: string, notification: Notification): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user?.email) return;

      await this.emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.message,
        notification.actionUrl,
      );

      await this.notificationRepository.update(notification.id, { emailSent: true });
      this.logger.log(`Email notification sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true },
    );
    return this.notificationRepository.findOne({ where: { id: notificationId } });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.delete({ id: notificationId, userId });
  }

  // ============ Specific Notification Methods ============

  async notifyNewMessage(userId: string, senderName: string, chatId: string, preview: string): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.MESSAGE,
      title: `New message from ${senderName}`,
      message: preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
      priority: NotificationPriority.NORMAL,
      actionUrl: `/chat/${chatId}`,
      metadata: { chatId, senderName },
    });
  }

  async notifyJobAlert(userId: string, job: any): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.JOB_ALERT,
      title: 'New job matches your skills',
      message: `"${job.title}" - ${job.budget ? `$${job.budget}` : 'Budget not specified'}`,
      priority: NotificationPriority.NORMAL,
      actionUrl: `/jobs/${job.id}`,
      metadata: { jobId: job.id, jobTitle: job.title },
    });
  }

  async notifyJobApplication(creatorId: string, applicantName: string, job: any): Promise<void> {
    await this.create({
      userId: creatorId,
      type: NotificationType.JOB_APPLICATION,
      title: 'New job application',
      message: `${applicantName} applied for "${job.title}"`,
      priority: NotificationPriority.NORMAL,
      actionUrl: `/jobs/${job.id}/applications`,
      metadata: { jobId: job.id, applicantName },
    });
  }

  async notifyJobAccepted(makerId: string, job: any): Promise<void> {
    await this.create({
      userId: makerId,
      type: NotificationType.JOB_ACCEPTED,
      title: 'Your application was accepted!',
      message: `You've been selected for "${job.title}"`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/jobs/${job.id}`,
      metadata: { jobId: job.id },
      sendEmail: true,
    });
  }

  async notifyCreditsLow(userId: string, balance: number): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.CREDITS_LOW,
      title: 'Credits running low',
      message: `You have ${balance} credits remaining. Top up to continue using AI features.`,
      priority: NotificationPriority.HIGH,
      actionUrl: '/credits',
      metadata: { balance },
      sendEmail: true,
    });
  }

  async notifyCreditsFinished(userId: string): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.CREDITS_FINISHED,
      title: 'Credits exhausted',
      message: 'You have 0 credits remaining. Please top up to continue using AI features.',
      priority: NotificationPriority.CRITICAL,
      actionUrl: '/credits',
      sendEmail: true,
    });
  }

  async notifyCreditPurchase(userId: string, credits: number, newBalance: number): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.CREDIT_PURCHASE,
      title: 'Credits added',
      message: `${credits} credits have been added to your account. New balance: ${newBalance}`,
      priority: NotificationPriority.NORMAL,
      actionUrl: '/credits',
      metadata: { credits, newBalance },
    });
  }

  async notifyEscrowFunded(makerId: string, amount: number, jobTitle: string, chatId: string): Promise<void> {
    await this.create({
      userId: makerId,
      type: NotificationType.ESCROW_FUNDED,
      title: 'Escrow funded',
      message: `$${amount} has been placed in escrow for "${jobTitle}"`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/chat/${chatId}`,
      metadata: { amount, jobTitle, chatId },
    });
  }

  async notifyEscrowReleased(makerId: string, amount: number, jobTitle: string): Promise<void> {
    await this.create({
      userId: makerId,
      type: NotificationType.ESCROW_RELEASED,
      title: 'Payment released',
      message: `$${amount} has been released to you for "${jobTitle}"`,
      priority: NotificationPriority.HIGH,
      actionUrl: '/earnings',
      metadata: { amount, jobTitle },
      sendEmail: true,
    });
  }
}
