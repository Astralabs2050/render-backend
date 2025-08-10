import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { ReconciliationService } from './services/reconciliation.service';
import { UsersController } from './users.controller';
import { CreatorController } from './controllers/creator.controller';
import { MakerController } from './controllers/maker.controller';
import { User } from './entities/user.entity';
import { Collection } from './entities/collection.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { ReconciliationJob } from './entities/reconciliation-job.entity';
import { Web3Module } from '../web3/web3.module';
@Module({
  imports: [TypeOrmModule.forFeature([User, Collection, PaymentIntent, ReconciliationJob]), Web3Module],
  controllers: [UsersController, CreatorController, MakerController],
  providers: [UsersService, ReconciliationService],
  exports: [UsersService],
})
export class UsersModule {}