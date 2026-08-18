import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import {
  ProjectEscrow,
  EscrowMilestoneItem,
} from './entities/project-escrow.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { MarketplaceChat } from '../marketplace/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserWallet,
      WalletTransaction,
      ProjectEscrow,
      EscrowMilestoneItem,
      WithdrawalRequest,
      MarketplaceChat,
      User,
    ]),
    CommonModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
