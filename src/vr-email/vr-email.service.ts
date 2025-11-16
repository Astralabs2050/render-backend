import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VrEmail } from './entities/vr-email.entity';
import { User } from '../users/entities/user.entity';
import { InsertVrEmailDto } from './dto/vr-email.dto';

@Injectable()
export class VrEmailService {
  private readonly logger = new Logger(VrEmailService.name);

  constructor(
    @InjectRepository(VrEmail)
    private vrEmailRepository: Repository<VrEmail>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async insertEmail(insertVrEmailDto: InsertVrEmailDto): Promise<VrEmail> {
    const { email } = insertVrEmailDto;

    // First, check if email exists in main User table
    const registeredUser = await this.userRepository.findOne({
      where: { email },
    });

    if (!registeredUser) {
      this.logger.warn(`Email ${email} is not a registered user`);
      throw new UnauthorizedException('Email not registered on platform. Please sign up first.');
    }

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
    this.logger.log(`VR access granted for registered user: ${email}`);
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
