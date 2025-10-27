import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThirdwebService } from './services/thirdweb.service';
import { IPFSService } from './services/ipfs.service';
import { NFTService } from './services/nft.service';
import { EscrowService } from './services/escrow.service';
import { QRService } from './services/qr.service';
import { WebhookService } from './services/webhook.service';
import { TransactionHashValidatorService } from './services/transaction-hash-validator.service';
import { ChatIdValidatorService } from './services/chat-id-validator.service';
import { HederaNFTService } from './services/hedera-nft.service';
import { Web3Controller } from './controllers/web3.controller';
import { NFT } from './entities/nft.entity';
import { EscrowContract } from './entities/escrow.entity';
import { QRCode } from './entities/qr.entity';
import { EscrowMilestone } from './entities/escrow.entity';
import { Chat } from '../ai-chat/entities/chat.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([NFT, EscrowContract, EscrowMilestone, QRCode, Chat]),
  ],
  controllers: [Web3Controller],
  providers: [
    ThirdwebService,
    IPFSService,
    NFTService,
    EscrowService,
    QRService,
    WebhookService,
    TransactionHashValidatorService,
    ChatIdValidatorService,
    HederaNFTService,
  ],
  exports: [
    ThirdwebService,
    IPFSService,
    NFTService,
    EscrowService,
    QRService,
    WebhookService,
    TransactionHashValidatorService,
    ChatIdValidatorService,
    HederaNFTService,
  ],
})
export class Web3Module { }