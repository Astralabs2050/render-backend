import { Controller, Post, Get, Body, Param, UseGuards, Req, Query, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NFTService, CreateNFTDto, MintNFTDto } from '../services/nft.service';
import { EscrowService, CreateEscrowDto, FundEscrowDto, ReleaseMilestoneDto } from '../services/escrow.service';
import { QRService, CreateQRDto } from '../services/qr.service';
import { WebhookService, DHLWebhookPayload } from '../services/webhook.service';
import { ThirdwebService } from '../services/thirdweb.service';
import { TransactionHashValidatorService } from '../services/transaction-hash-validator.service';
@Controller('web3')
export class Web3Controller {
    constructor(
        private readonly nftService: NFTService,
        private readonly escrowService: EscrowService,
        private readonly qrService: QRService,
        private readonly webhookService: WebhookService,
        private readonly thirdwebService: ThirdwebService,
        private readonly transactionHashValidator: TransactionHashValidatorService,
    ) { }
    @Post('nft/create')
    @UseGuards(JwtAuthGuard)
    async createNFT(@Req() req, @Body() dto: CreateNFTDto) {
        const nft = await this.nftService.createNFT({
            ...dto,
            creatorId: req.user.id,
        });
        return {
            status: true,
            message: 'NFT created successfully',
            data: nft,
        };
    }
    @Post('nft/mint')
    @UseGuards(JwtAuthGuard)
    async mintDesign(@Req() req, @Body() body: { chatId: string; selectedVariation: string; paymentTransactionHash: string }) {
        const startTime = Date.now();
        const requestId = `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            console.log(`[${requestId}] NFT minting request started`, {
                userId: req.user.id,
                chatId: body.chatId,
                selectedVariation: body.selectedVariation,
                transactionHashProvided: !!body.paymentTransactionHash,
                timestamp: new Date().toISOString()
            });

            const nft = await this.nftService.mintFromChatDesign(req.user.id, body.chatId, body.selectedVariation, body.paymentTransactionHash);
            
            const duration = Date.now() - startTime;
            console.log(`[${requestId}] NFT minting completed successfully`, {
                nftId: nft.id,
                tokenId: nft.tokenId,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });

            return {
                status: true,
                message: 'Design minted successfully',
                data: nft,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${requestId}] NFT minting failed`, {
                error: error.message,
                userId: req.user.id,
                chatId: body.chatId,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });

            // Check if it's a validation error
            if (error.message.includes('Transaction hash') || error.message.includes('Payment verification')) {
                const validationResult = this.transactionHashValidator.validateFormat(body.paymentTransactionHash);
                if (!validationResult.isValid) {
                    const errorResponse = this.transactionHashValidator.createErrorResponse(validationResult);
                    errorResponse.path = '/web3/nft/mint';
                    throw new HttpException(errorResponse, HttpStatus.BAD_REQUEST);
                }
            }

            // Handle other errors with standardized format
            throw new HttpException({
                status: false,
                message: 'Internal server error',
                error: error.message,
                path: '/web3/nft/mint',
                timestamp: new Date().toISOString(),
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @Post('nft/:id/list')
    @UseGuards(JwtAuthGuard)
    async listNFT(@Param('id') id: string) {
        const nft = await this.nftService.listNFT(id);
        return {
            status: true,
            message: 'NFT listed successfully',
            data: nft,
        };
    }
    @Get('nft/:id')
    async getNFT(@Param('id') id: string) {
        const nft = await this.nftService.findById(id);
        return {
            status: true,
            message: 'NFT retrieved successfully',
            data: nft,
        };
    }
    @Get('nft/creator/:creatorId')
    @UseGuards(JwtAuthGuard)
    async getNFTsByCreator(@Param('creatorId') creatorId: string) {
        const nfts = await this.nftService.findByCreator(creatorId);
        return {
            status: true,
            message: 'NFTs retrieved successfully',
            data: nfts,
        };
    }
    @Post('escrow/create')
    @UseGuards(JwtAuthGuard)
    async createEscrow(@Req() req, @Body() dto: CreateEscrowDto) {
        const escrow = await this.escrowService.createEscrow({
            ...dto,
            creatorId: req.user.id,
        });
        return {
            status: true,
            message: 'Escrow created successfully',
            data: escrow,
        };
    }
    @Post('escrow/fund')
    @UseGuards(JwtAuthGuard)
    async fundEscrow(@Body() dto: FundEscrowDto) {
        const escrow = await this.escrowService.fundEscrow(dto);
        return {
            status: true,
            message: 'Escrow funded successfully',
            data: escrow,
        };
    }
    @Post('escrow/milestone/complete')
    @UseGuards(JwtAuthGuard)
    async completeMilestone(@Body() body: { milestoneId: string }) {
        const milestone = await this.escrowService.completeMilestone(body.milestoneId);
        return {
            status: true,
            message: 'Milestone completed successfully',
            data: milestone,
        };
    }
    @Post('escrow/milestone/approve')
    @UseGuards(JwtAuthGuard)
    async approveMilestone(@Body() dto: ReleaseMilestoneDto) {
        const milestone = await this.escrowService.approveMilestone(dto);
        return {
            status: true,
            message: 'Milestone approved successfully',
            data: milestone,
        };
    }
    @Post('escrow/milestone/dispute')
    @UseGuards(JwtAuthGuard)
    async disputeMilestone(@Body() body: { milestoneId: string; reason: string }) {
        const milestone = await this.escrowService.disputeMilestone(body.milestoneId, body.reason);
        return {
            status: true,
            message: 'Milestone disputed successfully',
            data: milestone,
        };
    }
    @Get('escrow/:id')
    @UseGuards(JwtAuthGuard)
    async getEscrow(@Param('id') id: string) {
        const escrow = await this.escrowService.findById(id);
        return {
            status: true,
            message: 'Escrow retrieved successfully',
            data: escrow,
        };
    }
    @Get('escrow/:id/stats')
    @UseGuards(JwtAuthGuard)
    async getEscrowStats(@Param('id') id: string) {
        const stats = await this.escrowService.getEscrowStats(id);
        return {
            status: true,
            message: 'Escrow stats retrieved successfully',
            data: stats,
        };
    }
    @Get('escrow/creator/:creatorId')
    @UseGuards(JwtAuthGuard)
    async getEscrowsByCreator(@Param('creatorId') creatorId: string) {
        const escrows = await this.escrowService.findByCreator(creatorId);
        return {
            status: true,
            message: 'Escrows retrieved successfully',
            data: escrows,
        };
    }
    @Get('escrow/maker/:makerId')
    @UseGuards(JwtAuthGuard)
    async getEscrowsByMaker(@Param('makerId') makerId: string) {
        const escrows = await this.escrowService.findByMaker(makerId);
        return {
            status: true,
            message: 'Escrows retrieved successfully',
            data: escrows,
        };
    }
    @Post('qr/generate')
    @UseGuards(JwtAuthGuard)
    async generateQR(@Req() req, @Body() dto: CreateQRDto) {
        const qrCode = await this.qrService.generateNFTQR(dto.nftId, req.user.id);
        return {
            status: true,
            message: 'QR code generated successfully',
            data: qrCode,
        };
    }
    @Post('qr/verify')
    @UseGuards(JwtAuthGuard)
    async generateVerificationQR(@Req() req, @Body() body: { nftId: string }) {
        const qrCode = await this.qrService.generateVerificationQR(body.nftId, req.user.id);
        return {
            status: true,
            message: 'Verification QR code generated successfully',
            data: qrCode,
        };
    }
    @Get('qr/scan/:hash')
    async scanQR(@Param('hash') hash: string) {
        const result = await this.qrService.scanQR(hash);
        return {
            status: true,
            message: result.isValid ? 'QR code scanned successfully' : 'QR code is invalid or expired',
            data: result,
        };
    }
    @Get('qr/nft/:nftId')
    async getQRsByNFT(@Param('nftId') nftId: string) {
        const qrCodes = await this.qrService.findByNFT(nftId);
        return {
            status: true,
            message: 'QR codes retrieved successfully',
            data: qrCodes,
        };
    }
    @Get('qr/:nftId/stats')
    async getQRStats(@Param('nftId') nftId: string) {
        const stats = await this.qrService.getQRStats(nftId);
        return {
            status: true,
            message: 'QR stats retrieved successfully',
            data: stats,
        };
    }
    @Post('webhook/dhl')
    async handleDHLWebhook(@Body() payload: DHLWebhookPayload) {
        await this.webhookService.handleDHLWebhook(payload);
        return {
            status: true,
            message: 'DHL webhook processed successfully',
        };
    }
    @Post('webhook/blockchain')
    async handleBlockchainWebhook(@Body() payload: any) {
        await this.webhookService.processEventQueue(payload.events || []);
        return {
            status: true,
            message: 'Blockchain webhook processed successfully',
        };
    }
    @Get('wallet/address')
    @UseGuards(JwtAuthGuard)
    async getWalletAddress() {
        const address = await this.thirdwebService.getWalletAddress();
        return {
            status: true,
            message: 'Wallet address retrieved successfully',
            data: { address },
        };
    }
    @Get('wallet/balance')
    @UseGuards(JwtAuthGuard)
    async getWalletBalance() {
        const balance = await this.thirdwebService.getBalance();
        return {
            status: true,
            message: 'Wallet balance retrieved successfully',
            data: { balance },
        };
    }
    @Post('contract/deploy/nft')
    @UseGuards(JwtAuthGuard)
    async deployNFTContract(@Body() body: { name: string; symbol: string; description: string }) {
        const contractAddress = await this.thirdwebService.deployNFTContract(
            body.name,
            body.symbol,
            body.description
        );
        return {
            status: true,
            message: 'NFT contract deployed successfully',
            data: { contractAddress },
        };
    }
    @Post('contract/deploy/escrow')
    @UseGuards(JwtAuthGuard)
    async deployEscrowContract() {
        const contractAddress = await this.thirdwebService.deployEscrowContract();
        return {
            status: true,
            message: 'Escrow contract deployed successfully',
            data: { contractAddress },
        };
    }
    @Get('events/:contractAddress')
    @UseGuards(JwtAuthGuard)
    async getContractEvents(
        @Param('contractAddress') contractAddress: string,
        @Query('fromBlock') fromBlock?: number
    ) {
        const events = await this.webhookService.getEventLogs(contractAddress, fromBlock);
        return {
            status: true,
            message: 'Contract events retrieved successfully',
            data: events,
        };
    }
}