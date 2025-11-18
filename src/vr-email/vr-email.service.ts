import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VrEmail } from './entities/vr-email.entity';
import { InsertVrEmailDto } from './dto/vr-email.dto';

@Injectable()
export class VrEmailService {
  private readonly logger = new Logger(VrEmailService.name);

  constructor(
    @InjectRepository(VrEmail)
    private vrEmailRepository: Repository<VrEmail>,
  ) {}

  async insertEmail(insertVrEmailDto: InsertVrEmailDto): Promise<VrEmail> {
    const { email } = insertVrEmailDto;

    // Check for duplicates in VR emails
    const existingVrEmail = await this.vrEmailRepository.findOne({
      where: { email },
    });

    if (existingVrEmail) {
      this.logger.warn(`Email ${email} already logged into VR`);
      throw new ConflictException('Email already logged into VR experience');
    }

    const vrEmail = this.vrEmailRepository.create(insertVrEmailDto);
    const savedEmail = await this.vrEmailRepository.save(vrEmail);
    this.logger.log(`VR access granted for email: ${email}`);
    return savedEmail;
  }

  async getEmail(email: string): Promise<VrEmail> {
    const vrEmail = await this.vrEmailRepository.findOne({
      where: { email },
    });

    if (!vrEmail) {
      throw new NotFoundException('Email not found');
    }

    return vrEmail;
  }

  async getCurrentEmail(): Promise<VrEmail> {
    const vrEmail = await this.vrEmailRepository
      .createQueryBuilder('vr_email')
      .orderBy('vr_email.createdAt', 'DESC')
      .getOne();

    if (!vrEmail) {
      throw new NotFoundException('No email found in database');
    }

    return vrEmail;
  }

  async deleteEmail(email: string): Promise<void> {
    const vrEmail = await this.vrEmailRepository.findOne({
      where: { email },
    });

    if (!vrEmail) {
      throw new NotFoundException('Email not found');
    }

    await this.vrEmailRepository.remove(vrEmail);
    this.logger.log(`Email deleted: ${email}`);
  }
}
