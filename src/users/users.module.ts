import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { ReconciliationService } from './services/reconciliation.service';
import { DesignService } from './services/design.service';
import { UsersController } from './users.controller';
import { CreatorController } from './controllers/creator.controller';
import { MakerController } from './controllers/maker.controller';
import { DesignController } from './controllers/design.controller';
import { User } from './entities/user.entity';
import { Design } from './entities/collection.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { ReconciliationJob } from './entities/reconciliation-job.entity';
import { NFT } from '../web3/entities/nft.entity';
import { Web3Module } from '../web3/web3.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Design, PaymentIntent, ReconciliationJob, NFT]), 
    Web3Module,
    forwardRef(() => MarketplaceModule)
  ],
  controllers: [UsersController, CreatorController, MakerController, DesignController],
  providers: [UsersService, ReconciliationService, DesignService],
  exports: [UsersService, DesignService],
})
export class UsersModule {}