import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Waitlist } from './entities/waitlist.entity';
import { JoinWaitlistDto } from './dto/waitlist.dto';
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);
  constructor(
    @InjectRepository(Waitlist)
    private waitlistRepository: Repository<Waitlist>,
  ) {}
  async join(joinWaitlistDto: JoinWaitlistDto): Promise<Waitlist> {
    const { email } = joinWaitlistDto;
    const existingEntry = await this.waitlistRepository.findOne({
      where: { email },
    });
    if (existingEntry) {
      this.logger.warn(`Email ${email} already exists in waitlist`);
      throw new ConflictException('Email already exists in waitlist');
    }
    const waitlistEntry = this.waitlistRepository.create(joinWaitlistDto);
    const savedEntry = await this.waitlistRepository.save(waitlistEntry);
    this.logger.log(`Added to waitlist: ${email}`);
    return savedEntry;
  }
}