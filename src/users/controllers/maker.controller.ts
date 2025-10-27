import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('maker')
@UseGuards(JwtAuthGuard)
export class MakerController {
  @Get('dashboard')
  getMakerDashboard() {
    return {
      status: true,
      message: 'Maker dashboard data',
      data: {
        stats: {
          orders: 8,
          completedOrders: 5,
          revenue: 1200
        }
      }
    };
  }
}