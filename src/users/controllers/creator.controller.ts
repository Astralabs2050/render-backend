import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType } from '../entities/user.entity';

@Controller('creator')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserType.CREATOR)
export class CreatorController {
  @Get('dashboard')
  getCreatorDashboard() {
    return {
      status: true,
      message: 'Creator dashboard data',
      data: {
        stats: {
          designs: 10,
          followers: 250,
          sales: 15
        }
      }
    };
  }
}