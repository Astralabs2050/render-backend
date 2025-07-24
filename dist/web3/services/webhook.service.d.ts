import { ConfigService } from '@nestjs/config';
import { ThirdwebService } from './thirdweb.service';
import { EscrowService } from './escrow.service';
import { NFTService } from './nft.service';
export interface BlockchainEvent {
    eventName: string;
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    args: Record<string, any>;
    timestamp: Date;
}
export interface DHLWebhookPayload {
    trackingNumber: string;
    status: string;
    location: string;
    timestamp: string;
    deliveryConfirmed: boolean;
    recipientName?: string;
}
export declare class WebhookService {
    private configService;
    private thirdwebService;
    private escrowService;
    private nftService;
    private readonly logger;
    private readonly webhookSecret;
    constructor(configService: ConfigService, thirdwebService: ThirdwebService, escrowService: EscrowService, nftService: NFTService);
    private initializeEventListeners;
    handleNFTMinted(event: any): Promise<void>;
    handleNFTTransfer(event: any): Promise<void>;
    handleEscrowCreated(event: any): Promise<void>;
    handleMilestoneCompleted(event: any): Promise<void>;
    handlePaymentReleased(event: any): Promise<void>;
    handleDHLWebhook(payload: DHLWebhookPayload): Promise<void>;
    processEventQueue(events: BlockchainEvent[]): Promise<void>;
    private processBlockchainEvent;
    private sendChatNotification;
    private extractEscrowIdFromTracking;
    validateWebhookSignature(payload: string, signature: string): Promise<boolean>;
    getEventLogs(contractAddress: string, fromBlock?: number): Promise<BlockchainEvent[]>;
}
