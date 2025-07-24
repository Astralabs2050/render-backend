import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType } from '../entities/user.entity';

@Controller('maker')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserType.MAKER)
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