import { Controller, Post, Body } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/waitlist.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  async join(@Body() joinWaitlistDto: JoinWaitlistDto) {
    await this.waitlistService.join(joinWaitlistDto);
    return {
      status: true,
      message: 'Successfully added to waitlist',
    };
  }
}