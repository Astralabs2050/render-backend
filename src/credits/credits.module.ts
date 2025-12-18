import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { CreditService } from './services/credit.service';
import { CreditController } from './controllers/credit.controller';
import { User } from '../users/entities/user.entity';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditTransaction, User]),
    CommonModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditsModule {}
