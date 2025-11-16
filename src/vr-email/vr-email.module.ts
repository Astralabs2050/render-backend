import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VrEmailController } from './vr-email.controller';
import { VrEmailService } from './vr-email.service';
import { VrEmail } from './entities/vr-email.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VrEmail, User])],
  controllers: [VrEmailController],
  providers: [VrEmailService],
  exports: [VrEmailService],
})
export class VrEmailModule {}
