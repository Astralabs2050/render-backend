import { Controller, Post, Get, Body, Param, UseGuards, Req, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NFTService, CreateNFTDto, MintNFTDto } from '../services/nft.service';
import { EscrowService, CreateEscrowDto, FundEscrowDto, ReleaseMilestoneDto } from '../services/escrow.service';
import { QRService, CreateQRDto } from '../services/qr.service';
import { WebhookService, DHLWebhookPayload } from '../services/webhook.service';
import { ThirdwebService } from '../services/thirdweb.service';
import { TransactionHashValidatorService } from '../services/transaction-hash-validator.service';
import { HederaNFTService } from '../services/hedera-nft.service';
import { HederaEscrowService } from '../services/hedera-escrow.service';
import { MintNFTRequestDto } from '../dto/mint-nft-request.dto';
import { UsersService } from '../../users/users.service';
@Controller('web3')
export class Web3Controller {
    private readonly logger = new Logger(Web3Controller.name);
    constructor(
        private readonly nftService: NFTService,
        private readonly escrowService: EscrowService,
        private readonly qrService: QRService,
        private readonly webhookService: WebhookService,
        private readonly thirdwebService: ThirdwebService,
        private readonly transactionHashValidator: TransactionHashValidatorService,
        private readonly hederaNFTService: HederaNFTService,
        private readonly hederaEscrowService: HederaEscrowService,
        private readonly usersService: UsersService,
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
    async mintDesign(@Req() req, @Body() body: MintNFTRequestDto) {
        const startTime = Date.now();
        const requestId = `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            if (body.designId && (body.chatId || body.selectedVariation)) {
                throw new HttpException({
                    status: false,
                    message: 'Invalid request. Cannot provide both designId and chatId/selectedVariation. Choose one minting flow only.',
                    path: '/web3/nft/mint',
                    timestamp: new Date().toISOString(),
                }, HttpStatus.BAD_REQUEST);
            }

            if ((body.chatId && !body.selectedVariation) || (!body.chatId && body.selectedVariation)) {
                throw new HttpException({
                    status: false,
                    message: 'Invalid request. Both chatId and selectedVariation are required for AI-generated designs.',
                    path: '/web3/nft/mint',
                    timestamp: new Date().toISOString(),
                }, HttpStatus.BAD_REQUEST);
            }

            const isDirectUpload = !!body.designId;
            const isAIGenerated = !!body.chatId && !!body.selectedVariation;

            if (!isDirectUpload && !isAIGenerated) {
                throw new HttpException({
                    status: false,
                    message: 'Invalid request. Provide either (chatId + selectedVariation) for AI designs or (designId) for uploaded designs',
                    path: '/web3/nft/mint',
                    timestamp: new Date().toISOString(),
                }, HttpStatus.BAD_REQUEST);
            }

            console.log(`[${requestId}] NFT minting request started`, {
                userId: req.user.id,
                mintType: isDirectUpload ? 'uploaded_design' : 'ai_generated',
                chatId: body.chatId,
                designId: body.designId,
                selectedVariation: body.selectedVariation,
                transactionHashProvided: !!body.paymentTransactionHash,
                timestamp: new Date().toISOString()
            });

            let nft: any;
            if (isDirectUpload) {
                // Mint from uploaded design
                nft = await this.nftService.mintFromUploadedDesign(
                    req.user.id,
                    body.designId!,
                    body.paymentTransactionHash,
                    body.name,
                    body.quantity
                );
            } else {
                // Mint from AI-generated chat design
                nft = await this.nftService.mintFromChatDesign(
                    req.user.id,
                    body.chatId!,
                    body.selectedVariation!,
                    body.paymentTransactionHash,
                    body.name,
                    body.quantity
                );
            }

            const duration = Date.now() - startTime;
            console.log(`[${requestId}] NFT minting completed successfully`, {
                nftId: nft.id,
                tokenId: nft.tokenId,
                mintType: isDirectUpload ? 'uploaded_design' : 'ai_generated',
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
                designId: body.designId,
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
    @Post('hedera/mint')
    @UseGuards(JwtAuthGuard)
    async mintHederaCollectible(@Req() req, @Body() body: MintNFTRequestDto) {
        // Get NFT details from database
        const nft = body.designId 
            ? await this.nftService.findById(body.designId)
            : await this.nftService.findByChat(body.chatId!);
        
        if (!nft || (Array.isArray(nft) && nft.length === 0)) {
            throw new HttpException(
                {
                    status: false,
                    message: 'Design not found',
                    path: '/web3/hedera/mint',
                    timestamp: new Date().toISOString(),
                },
                HttpStatus.NOT_FOUND
            );
        }

        const design = Array.isArray(nft) ? nft[0] : nft;
        const quantity = body.quantity || 1;
        
        const recipientAddress = body.recipientAddress || (await this.usersService.ensureUserHasWallet(req.user.id));

        const result = await this.hederaNFTService.mintCollectibles({
            recipientAddress,
            designId: design.id,
            designName: body.name || design.name || 'Untitled Design',
            designImage: design.imageUrl || '',
            prompt: design.description || '',
            count: quantity,
        });

        if (!result.success) {
            throw new HttpException(
                {
                    status: false,
                    message: result.error,
                    path: '/web3/hedera/mint',
                    timestamp: new Date().toISOString(),
                },
                HttpStatus.BAD_REQUEST
            );
        }

        return {
            status: true,
            message: 'Hedera collectibles minted successfully',
            data: {
                tokenIds: result.tokenIds,
                txHash: result.txHash,
            },
        };
    }

    @Post('hedera/escrows')
    @UseGuards(JwtAuthGuard)
    async createHederaEscrow(
        @Req() req,
        @Body() body: { shopper: string; maker: string; creator: string; amount: string; nftTokenId: number }
    ) {
        const result = await this.hederaEscrowService.createEscrowByAgent({
            shopper: body.shopper,
            maker: body.maker,
            creator: body.creator,
            amount: BigInt(body.amount),
            nftTokenId: body.nftTokenId,
        });

        if (!result.success) {
            throw new HttpException(
                {
                    status: false,
                    message: result.error,
                    path: '/web3/hedera/escrows',
                    timestamp: new Date().toISOString(),
                },
                HttpStatus.BAD_REQUEST
            );
        }

        return {
            status: true,
            message: 'Hedera escrow created successfully',
            data: {
                escrowId: result.escrowId,
                txHash: result.txHash,
            },
        };
    }

    @Get('hedera/escrows')
    @UseGuards(JwtAuthGuard)
    async getAllHederaEscrows() {
        const escrows = await this.hederaEscrowService.getAllEscrows();
        return {
            status: true,
            message: 'Hedera escrows retrieved successfully',
            data: escrows,
        };
    }

    @Post('hedera/nfts/:tokenId/listings')
    @UseGuards(JwtAuthGuard)
    async listHederaNFT(@Param('tokenId') tokenId: string, @Body() body: { price: string }) {
        const result = await this.hederaNFTService.listNFT(Number(tokenId), BigInt(body.price));
        if (!result.success) {
            throw new HttpException(
                {
                    status: false,
                    message: result.error,
                    path: '/web3/hedera/nfts/:tokenId/listings',
                    timestamp: new Date().toISOString(),
                },
                HttpStatus.BAD_REQUEST
            );
        }
        return {
            status: true,
            message: 'NFT listed successfully',
            data: { txHash: result.txHash },
        };
    }

    @Post('hedera/nfts/listings/batch')
    @UseGuards(JwtAuthGuard)
    async listHederaNFTsByQuantity(@Body() body: { quantity: number; price: string }) {
        const result = await this.hederaNFTService.listOwnedNFTsByQuantity(body.quantity, BigInt(body.price));
        if (!result.success) {
            throw new HttpException(
                {
                    status: false,
                    message: result.error,
                    path: '/web3/hedera/nfts/listings/batch',
                    timestamp: new Date().toISOString(),
                },
                HttpStatus.BAD_REQUEST
            );
        }
        return {
            status: true,
            message: 'NFTs listed successfully',
            data: { txHash: result.txHash },
        };
    }

    @Get('hedera/nfts/:tokenId/listings')
    async getHederaNFTListing(@Param('tokenId') tokenId: string) {
        const listing = await this.hederaNFTService.getListing(Number(tokenId));
        return {
            status: true,
            message: 'NFT listing details retrieved',
            data: listing,
        };
    }

    @Get('hedera/nfts/listings/sellers/:address')
    async getHederaSellerListings(@Param('address') address: string) {
        const tokenIds = await this.hederaNFTService.getSellerListings(address);
        return {
            status: true,
            message: 'Seller listings retrieved',
            data: { tokenIds },
        };
    }

    @Get('hedera/nfts/listings')
    async getHederaActiveListings() {
        const tokenIds = await this.hederaNFTService.getActiveListings();
        return {
            status: true,
            message: 'Active listings retrieved',
            data: { tokenIds },
        };
    }
}