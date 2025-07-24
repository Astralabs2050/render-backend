import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThirdwebService } from './thirdweb.service';
import { EscrowService } from './escrow.service';
import { NFTService } from './nft.service';
import { StreamChatService } from '../../ai-chat/services/stream-chat.service';

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

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private thirdwebService: ThirdwebService,
    private escrowService: EscrowService,
    private nftService: NFTService,
    private streamChatService: StreamChatService,
  ) {
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
    this.initializeEventListeners();
  }

  private async initializeEventListeners(): Promise<void> {
    try {
      const nftContractAddress = this.configService.get<string>('NFT_CONTRACT_ADDRESS');
      const escrowContractAddress = this.configService.get<string>('ESCROW_CONTRACT_ADDRESS');

      if (nftContractAddress) {
        // Listen to NFT events
        await this.thirdwebService.listenToContractEvents(
          nftContractAddress,
          'TokenMinted',
          this.handleNFTMinted.bind(this)
        );

        await this.thirdwebService.listenToContractEvents(
          nftContractAddress,
          'Transfer',
          this.handleNFTTransfer.bind(this)
        );
      }

      if (escrowContractAddress) {
        // Listen to Escrow events
        await this.thirdwebService.listenToContractEvents(
          escrowContractAddress,
          'EscrowCreated',
          this.handleEscrowCreated.bind(this)
        );

        await this.thirdwebService.listenToContractEvents(
          escrowContractAddress,
          'MilestoneCompleted',
          this.handleMilestoneCompleted.bind(this)
        );

        await this.thirdwebService.listenToContractEvents(
          escrowContractAddress,
          'PaymentReleased',
          this.handlePaymentReleased.bind(this)
        );
      }

      this.logger.log('Blockchain event listeners initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize event listeners: ${error.message}`);
    }
  }

  async handleNFTMinted(event: any): Promise<void> {
    try {
      this.logger.log(`NFT Minted Event: ${JSON.stringify(event)}`);

      const { tokenId, to, tokenURI } = event.args;
      
      // Update NFT in database
      // This would typically involve finding the NFT by some identifier
      // and updating its minted status

      // Send notification via Stream Chat
      await this.sendChatNotification(
        to, // recipient user ID
        `🎉 Your NFT has been successfully minted! Token ID: ${tokenId}`,
        'nft_minted',
        { tokenId, tokenURI }
      );

    } catch (error) {
      this.logger.error(`Failed to handle NFT minted event: ${error.message}`);
    }
  }

  async handleNFTTransfer(event: any): Promise<void> {
    try {
      this.logger.log(`NFT Transfer Event: ${JSON.stringify(event)}`);

      const { from, to, tokenId } = event.args;

      // Skip mint transfers (from zero address)
      if (from === '0x0000000000000000000000000000000000000000') {
        return;
      }

      // Send notifications to both parties
      await this.sendChatNotification(
        from,
        `📤 Your NFT (Token ID: ${tokenId}) has been transferred`,
        'nft_transfer_sent',
        { tokenId, to }
      );

      await this.sendChatNotification(
        to,
        `📥 You received an NFT! Token ID: ${tokenId}`,
        'nft_transfer_received',
        { tokenId, from }
      );

    } catch (error) {
      this.logger.error(`Failed to handle NFT transfer event: ${error.message}`);
    }
  }

  async handleEscrowCreated(event: any): Promise<void> {
    try {
      this.logger.log(`Escrow Created Event: ${JSON.stringify(event)}`);

      const { escrowId, creator, maker, amount } = event.args;

      // Send notifications
      await this.sendChatNotification(
        creator,
        `💰 Escrow created successfully! Amount: ${amount} ETH`,
        'escrow_created',
        { escrowId, maker, amount }
      );

      await this.sendChatNotification(
        maker,
        `🤝 You've been added to an escrow contract! Amount: ${amount} ETH`,
        'escrow_joined',
        { escrowId, creator, amount }
      );

    } catch (error) {
      this.logger.error(`Failed to handle escrow created event: ${error.message}`);
    }
  }

  async handleMilestoneCompleted(event: any): Promise<void> {
    try {
      this.logger.log(`Milestone Completed Event: ${JSON.stringify(event)}`);

      const { escrowId, milestoneId, amount } = event.args;

      // Update milestone in database
      await this.escrowService.completeMilestone(milestoneId);

      // Get escrow details for notifications
      const escrow = await this.escrowService.findById(escrowId);

      await this.sendChatNotification(
        escrow.creatorId,
        `✅ Milestone completed! Please review and approve to release ${amount} ETH`,
        'milestone_completed',
        { escrowId, milestoneId, amount }
      );

      await this.sendChatNotification(
        escrow.makerId,
        `🎯 Milestone completed! Waiting for creator approval to release ${amount} ETH`,
        'milestone_waiting_approval',
        { escrowId, milestoneId, amount }
      );

    } catch (error) {
      this.logger.error(`Failed to handle milestone completed event: ${error.message}`);
    }
  }

  async handlePaymentReleased(event: any): Promise<void> {
    try {
      this.logger.log(`Payment Released Event: ${JSON.stringify(event)}`);

      const { escrowId, milestoneId, recipient, amount } = event.args;

      // Update milestone in database
      await this.escrowService.approveMilestone({
        milestoneId,
        transactionHash: event.transactionHash,
      });

      // Get escrow details
      const escrow = await this.escrowService.findById(escrowId);

      await this.sendChatNotification(
        recipient,
        `💸 Payment released! You received ${amount} ETH`,
        'payment_received',
        { escrowId, milestoneId, amount }
      );

      await this.sendChatNotification(
        escrow.creatorId,
        `✅ Payment of ${amount} ETH has been released to the maker`,
        'payment_released',
        { escrowId, milestoneId, amount, recipient }
      );

    } catch (error) {
      this.logger.error(`Failed to handle payment released event: ${error.message}`);
    }
  }

  async handleDHLWebhook(payload: DHLWebhookPayload): Promise<void> {
    try {
      this.logger.log(`DHL Webhook: ${JSON.stringify(payload)}`);

      if (payload.deliveryConfirmed) {
        // Find escrow by tracking number
        // This would require storing tracking numbers in escrow metadata
        
        // For now, we'll assume the tracking number contains the escrow ID
        const escrowId = this.extractEscrowIdFromTracking(payload.trackingNumber);
        
        if (escrowId) {
          const escrow = await this.escrowService.findById(escrowId);
          
          // Find the delivery milestone (usually the last one)
          const deliveryMilestone = escrow.milestones
            .sort((a, b) => b.order - a.order)[0]; // Last milestone
          
          if (deliveryMilestone) {
            await this.escrowService.completeMilestone(deliveryMilestone.id);
            
            // Send notifications
            await this.sendChatNotification(
              escrow.creatorId,
              `📦 Delivery confirmed! Your order has been delivered successfully.`,
              'delivery_confirmed',
              { 
                trackingNumber: payload.trackingNumber,
                location: payload.location,
                timestamp: payload.timestamp 
              }
            );

            await this.sendChatNotification(
              escrow.makerId,
              `✅ Delivery confirmed! Final payment will be released automatically.`,
              'delivery_milestone_completed',
              { 
                trackingNumber: payload.trackingNumber,
                escrowId: escrow.id 
              }
            );
          }
        }
      }

    } catch (error) {
      this.logger.error(`Failed to handle DHL webhook: ${error.message}`);
    }
  }

  async processEventQueue(events: BlockchainEvent[]): Promise<void> {
    try {
      this.logger.log(`Processing ${events.length} blockchain events`);

      for (const event of events) {
        await this.processBlockchainEvent(event);
      }

      this.logger.log(`Processed ${events.length} events successfully`);
    } catch (error) {
      this.logger.error(`Failed to process event queue: ${error.message}`);
    }
  }

  private async processBlockchainEvent(event: BlockchainEvent): Promise<void> {
    try {
      switch (event.eventName) {
        case 'TokenMinted':
          await this.handleNFTMinted(event);
          break;
        case 'Transfer':
          await this.handleNFTTransfer(event);
          break;
        case 'EscrowCreated':
          await this.handleEscrowCreated(event);
          break;
        case 'MilestoneCompleted':
          await this.handleMilestoneCompleted(event);
          break;
        case 'PaymentReleased':
          await this.handlePaymentReleased(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.eventName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process event ${event.eventName}: ${error.message}`);
    }
  }

  private async sendChatNotification(
    userId: string,
    message: string,
    type: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // This would typically send a notification via Stream Chat
      // For now, we'll log it
      this.logger.log(`Chat Notification - User: ${userId}, Type: ${type}, Message: ${message}`);
      
      // In a real implementation:
      // await this.streamChatService.sendSystemMessage(userId, message, { type, ...metadata });
      
    } catch (error) {
      this.logger.error(`Failed to send chat notification: ${error.message}`);
    }
  }

  private extractEscrowIdFromTracking(trackingNumber: string): string | null {
    // This is a placeholder implementation
    // In reality, you'd have a mapping table or encode the escrow ID in the tracking number
    const match = trackingNumber.match(/ESCROW-(.+)/);
    return match ? match[1] : null;
  }

  async validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Implement webhook signature validation
      // This would typically use HMAC with your webhook secret
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      this.logger.error(`Webhook signature validation failed: ${error.message}`);
      return false;
    }
  }

  async getEventLogs(contractAddress: string, fromBlock?: number): Promise<BlockchainEvent[]> {
    try {
      const events = await this.thirdwebService.getContractEvents(
        contractAddress,
        'allEvents',
        fromBlock
      );

      return events.map(event => ({
        eventName: event.eventName,
        contractAddress,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        args: event.args,
        timestamp: new Date(event.timestamp * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to get event logs: ${error.message}`);
      throw error;
    }
  }
}