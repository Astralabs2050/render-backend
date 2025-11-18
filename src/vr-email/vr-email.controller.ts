import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { VrEmailService } from './vr-email.service';
import { InsertVrEmailDto } from './dto/vr-email.dto';

@Controller('vr-email')
export class VrEmailController {
  constructor(private readonly vrEmailService: VrEmailService) {}

  @Post()
  async insertEmail(@Body() insertVrEmailDto: InsertVrEmailDto) {
    const result = await this.vrEmailService.insertEmail(insertVrEmailDto);
    return {
      status: true,
      message: 'Email inserted successfully',
      data: result,
    };
  }

  @Get()
  async getEmail() {
    const result = await this.vrEmailService.getCurrentEmail();
    return {
      status: true,
      data: result,
    };
  }

  @Delete(':email')
  async deleteEmail(@Param('email') email: string) {
    await this.vrEmailService.deleteEmail(email);
    return {
      status: true,
      message: 'Email deleted successfully',
    };
  }
}
