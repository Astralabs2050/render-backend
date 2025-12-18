import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const result = await this.notificationService.getUserNotifications(
      req.user.id,
      parseInt(page || '1'),
      parseInt(limit || '20'),
      unreadOnly === 'true',
    );
    return {
      status: true,
      message: 'Notifications retrieved',
      data: result,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return {
      status: true,
      message: 'Unread count retrieved',
      data: { count },
    };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req, @Param('id') id: string) {
    const notification = await this.notificationService.markAsRead(req.user.id, id);
    return {
      status: true,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req) {
    await this.notificationService.markAllAsRead(req.user.id);
    return {
      status: true,
      message: 'All notifications marked as read',
      data: null,
    };
  }

  @Delete(':id')
  async deleteNotification(@Req() req, @Param('id') id: string) {
    await this.notificationService.deleteNotification(req.user.id, id);
    return {
      status: true,
      message: 'Notification deleted',
      data: null,
    };
  }
}
