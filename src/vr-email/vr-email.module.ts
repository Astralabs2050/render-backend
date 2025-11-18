import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VrEmailController } from './vr-email.controller';
import { VrEmailService } from './vr-email.service';
import { VrEmail } from './entities/vr-email.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VrEmail])],
  controllers: [VrEmailController],
  providers: [VrEmailService],
  exports: [VrEmailService],
})
export class VrEmailModule {}
