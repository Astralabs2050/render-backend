import { Controller, Get, Param, ParseUUIDPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { DesignService } from '../services/design.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('designs')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDesignById(@Param('id', ParseUUIDPipe) designId: string) {
    const design = await this.designService.getDesignPublic(designId);

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    return {
      status: true,
      message: 'Design retrieved successfully',
      data: design,
    };
  }
}
