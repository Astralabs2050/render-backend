"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const thirdweb_service_1 = require("./thirdweb.service");
const escrow_service_1 = require("./escrow.service");
const nft_service_1 = require("./nft.service");
const stream_chat_service_1 = require("../../ai-chat/services/stream-chat.service");
let WebhookService = WebhookService_1 = class WebhookService {
    constructor(configService, thirdwebService, escrowService, nftService, streamChatService) {
        this.configService = configService;
        this.thirdwebService = thirdwebService;
        this.escrowService = escrowService;
        this.nftService = nftService;
        this.streamChatService = streamChatService;
        this.logger = new common_1.Logger(WebhookService_1.name);
        this.webhookSecret = this.configService.get('WEBHOOK_SECRET');
        this.initializeEventListeners();
    }
    async initializeEventListeners() {
        try {
            const nftContractAddress = this.configService.get('NFT_CONTRACT_ADDRESS');
            const escrowContractAddress = this.configService.get('ESCROW_CONTRACT_ADDRESS');
            if (nftContractAddress) {
                await this.thirdwebService.listenToContractEvents(nftContractAddress, 'TokenMinted', this.handleNFTMinted.bind(this));
                await this.thirdwebService.listenToContractEvents(nftContractAddress, 'Transfer', this.handleNFTTransfer.bind(this));
            }
            if (escrowContractAddress) {
                await this.thirdwebService.listenToContractEvents(escrowContractAddress, 'EscrowCreated', this.handleEscrowCreated.bind(this));
                await this.thirdwebService.listenToContractEvents(escrowContractAddress, 'MilestoneCompleted', this.handleMilestoneCompleted.bind(this));
                await this.thirdwebService.listenToContractEvents(escrowContractAddress, 'PaymentReleased', this.handlePaymentReleased.bind(this));
            }
            this.logger.log('Blockchain event listeners initialized');
        }
        catch (error) {
            this.logger.error(`Failed to initialize event listeners: ${error.message}`);
        }
    }
    async handleNFTMinted(event) {
        try {
            this.logger.log(`NFT Minted Event: ${JSON.stringify(event)}`);
            const { tokenId, to, tokenURI } = event.args;
            await this.sendChatNotification(to, `🎉 Your NFT has been successfully minted! Token ID: ${tokenId}`, 'nft_minted', { tokenId, tokenURI });
        }
        catch (error) {
            this.logger.error(`Failed to handle NFT minted event: ${error.message}`);
        }
    }
    async handleNFTTransfer(event) {
        try {
            this.logger.log(`NFT Transfer Event: ${JSON.stringify(event)}`);
            const { from, to, tokenId } = event.args;
            if (from === '0x0000000000000000000000000000000000000000') {
                return;
            }
            await this.sendChatNotification(from, `📤 Your NFT (Token ID: ${tokenId}) has been transferred`, 'nft_transfer_sent', { tokenId, to });
            await this.sendChatNotification(to, `📥 You received an NFT! Token ID: ${tokenId}`, 'nft_transfer_received', { tokenId, from });
        }
        catch (error) {
            this.logger.error(`Failed to handle NFT transfer event: ${error.message}`);
        }
    }
    async handleEscrowCreated(event) {
        try {
            this.logger.log(`Escrow Created Event: ${JSON.stringify(event)}`);
            const { escrowId, creator, maker, amount } = event.args;
            await this.sendChatNotification(creator, `💰 Escrow created successfully! Amount: ${amount} ETH`, 'escrow_created', { escrowId, maker, amount });
            await this.sendChatNotification(maker, `🤝 You've been added to an escrow contract! Amount: ${amount} ETH`, 'escrow_joined', { escrowId, creator, amount });
        }
        catch (error) {
            this.logger.error(`Failed to handle escrow created event: ${error.message}`);
        }
    }
    async handleMilestoneCompleted(event) {
        try {
            this.logger.log(`Milestone Completed Event: ${JSON.stringify(event)}`);
            const { escrowId, milestoneId, amount } = event.args;
            await this.escrowService.completeMilestone(milestoneId);
            const escrow = await this.escrowService.findById(escrowId);
            await this.sendChatNotification(escrow.creatorId, `✅ Milestone completed! Please review and approve to release ${amount} ETH`, 'milestone_completed', { escrowId, milestoneId, amount });
            await this.sendChatNotification(escrow.makerId, `🎯 Milestone completed! Waiting for creator approval to release ${amount} ETH`, 'milestone_waiting_approval', { escrowId, milestoneId, amount });
        }
        catch (error) {
            this.logger.error(`Failed to handle milestone completed event: ${error.message}`);
        }
    }
    async handlePaymentReleased(event) {
        try {
            this.logger.log(`Payment Released Event: ${JSON.stringify(event)}`);
            const { escrowId, milestoneId, recipient, amount } = event.args;
            await this.escrowService.approveMilestone({
                milestoneId,
                transactionHash: event.transactionHash,
            });
            const escrow = await this.escrowService.findById(escrowId);
            await this.sendChatNotification(recipient, `💸 Payment released! You received ${amount} ETH`, 'payment_received', { escrowId, milestoneId, amount });
            await this.sendChatNotification(escrow.creatorId, `✅ Payment of ${amount} ETH has been released to the maker`, 'payment_released', { escrowId, milestoneId, amount, recipient });
        }
        catch (error) {
            this.logger.error(`Failed to handle payment released event: ${error.message}`);
        }
    }
    async handleDHLWebhook(payload) {
        try {
            this.logger.log(`DHL Webhook: ${JSON.stringify(payload)}`);
            if (payload.deliveryConfirmed) {
                const escrowId = this.extractEscrowIdFromTracking(payload.trackingNumber);
                if (escrowId) {
                    const escrow = await this.escrowService.findById(escrowId);
                    const deliveryMilestone = escrow.milestones
                        .sort((a, b) => b.order - a.order)[0];
                    if (deliveryMilestone) {
                        await this.escrowService.completeMilestone(deliveryMilestone.id);
                        await this.sendChatNotification(escrow.creatorId, `📦 Delivery confirmed! Your order has been delivered successfully.`, 'delivery_confirmed', {
                            trackingNumber: payload.trackingNumber,
                            location: payload.location,
                            timestamp: payload.timestamp
                        });
                        await this.sendChatNotification(escrow.makerId, `✅ Delivery confirmed! Final payment will be released automatically.`, 'delivery_milestone_completed', {
                            trackingNumber: payload.trackingNumber,
                            escrowId: escrow.id
                        });
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to handle DHL webhook: ${error.message}`);
        }
    }
    async processEventQueue(events) {
        try {
            this.logger.log(`Processing ${events.length} blockchain events`);
            for (const event of events) {
                await this.processBlockchainEvent(event);
            }
            this.logger.log(`Processed ${events.length} events successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to process event queue: ${error.message}`);
        }
    }
    async processBlockchainEvent(event) {
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
        }
        catch (error) {
            this.logger.error(`Failed to process event ${event.eventName}: ${error.message}`);
        }
    }
    async sendChatNotification(userId, message, type, metadata) {
        try {
            this.logger.log(`Chat Notification - User: ${userId}, Type: ${type}, Message: ${message}`);
        }
        catch (error) {
            this.logger.error(`Failed to send chat notification: ${error.message}`);
        }
    }
    extractEscrowIdFromTracking(trackingNumber) {
        const match = trackingNumber.match(/ESCROW-(.+)/);
        return match ? match[1] : null;
    }
    async validateWebhookSignature(payload, signature) {
        try {
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(payload)
                .digest('hex');
            return signature === expectedSignature;
        }
        catch (error) {
            this.logger.error(`Webhook signature validation failed: ${error.message}`);
            return false;
        }
    }
    async getEventLogs(contractAddress, fromBlock) {
        try {
            const events = await this.thirdwebService.getContractEvents(contractAddress, 'allEvents', fromBlock);
            return events.map(event => ({
                eventName: event.eventName,
                contractAddress,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
                args: event.args,
                timestamp: new Date(event.timestamp * 1000),
            }));
        }
        catch (error) {
            this.logger.error(`Failed to get event logs: ${error.message}`);
            throw error;
        }
    }
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = WebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        thirdweb_service_1.ThirdwebService,
        escrow_service_1.EscrowService,
        nft_service_1.NFTService,
        stream_chat_service_1.StreamChatService])
], WebhookService);
//# sourceMappingURL=webhook.service.js.map