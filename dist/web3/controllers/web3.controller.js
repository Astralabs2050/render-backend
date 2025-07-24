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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Controller = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const nft_service_1 = require("../services/nft.service");
const escrow_service_1 = require("../services/escrow.service");
const qr_service_1 = require("../services/qr.service");
const webhook_service_1 = require("../services/webhook.service");
const thirdweb_service_1 = require("../services/thirdweb.service");
let Web3Controller = class Web3Controller {
    constructor(nftService, escrowService, qrService, webhookService, thirdwebService) {
        this.nftService = nftService;
        this.escrowService = escrowService;
        this.qrService = qrService;
        this.webhookService = webhookService;
        this.thirdwebService = thirdwebService;
    }
    async createNFT(req, dto) {
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
    async mintNFT(dto) {
        const nft = await this.nftService.mintNFT(dto);
        return {
            status: true,
            message: 'NFT minted successfully',
            data: nft,
        };
    }
    async listNFT(id) {
        const nft = await this.nftService.listNFT(id);
        return {
            status: true,
            message: 'NFT listed successfully',
            data: nft,
        };
    }
    async getNFT(id) {
        const nft = await this.nftService.findById(id);
        return {
            status: true,
            message: 'NFT retrieved successfully',
            data: nft,
        };
    }
    async getNFTsByCreator(creatorId) {
        const nfts = await this.nftService.findByCreator(creatorId);
        return {
            status: true,
            message: 'NFTs retrieved successfully',
            data: nfts,
        };
    }
    async createEscrow(req, dto) {
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
    async fundEscrow(dto) {
        const escrow = await this.escrowService.fundEscrow(dto);
        return {
            status: true,
            message: 'Escrow funded successfully',
            data: escrow,
        };
    }
    async completeMilestone(body) {
        const milestone = await this.escrowService.completeMilestone(body.milestoneId);
        return {
            status: true,
            message: 'Milestone completed successfully',
            data: milestone,
        };
    }
    async approveMilestone(dto) {
        const milestone = await this.escrowService.approveMilestone(dto);
        return {
            status: true,
            message: 'Milestone approved successfully',
            data: milestone,
        };
    }
    async disputeMilestone(body) {
        const milestone = await this.escrowService.disputeMilestone(body.milestoneId, body.reason);
        return {
            status: true,
            message: 'Milestone disputed successfully',
            data: milestone,
        };
    }
    async getEscrow(id) {
        const escrow = await this.escrowService.findById(id);
        return {
            status: true,
            message: 'Escrow retrieved successfully',
            data: escrow,
        };
    }
    async getEscrowStats(id) {
        const stats = await this.escrowService.getEscrowStats(id);
        return {
            status: true,
            message: 'Escrow stats retrieved successfully',
            data: stats,
        };
    }
    async getEscrowsByCreator(creatorId) {
        const escrows = await this.escrowService.findByCreator(creatorId);
        return {
            status: true,
            message: 'Escrows retrieved successfully',
            data: escrows,
        };
    }
    async getEscrowsByMaker(makerId) {
        const escrows = await this.escrowService.findByMaker(makerId);
        return {
            status: true,
            message: 'Escrows retrieved successfully',
            data: escrows,
        };
    }
    async generateQR(req, dto) {
        const qrCode = await this.qrService.generateNFTQR(dto.nftId, req.user.id);
        return {
            status: true,
            message: 'QR code generated successfully',
            data: qrCode,
        };
    }
    async generateVerificationQR(req, body) {
        const qrCode = await this.qrService.generateVerificationQR(body.nftId, req.user.id);
        return {
            status: true,
            message: 'Verification QR code generated successfully',
            data: qrCode,
        };
    }
    async scanQR(hash) {
        const result = await this.qrService.scanQR(hash);
        return {
            status: true,
            message: result.isValid ? 'QR code scanned successfully' : 'QR code is invalid or expired',
            data: result,
        };
    }
    async getQRsByNFT(nftId) {
        const qrCodes = await this.qrService.findByNFT(nftId);
        return {
            status: true,
            message: 'QR codes retrieved successfully',
            data: qrCodes,
        };
    }
    async getQRStats(nftId) {
        const stats = await this.qrService.getQRStats(nftId);
        return {
            status: true,
            message: 'QR stats retrieved successfully',
            data: stats,
        };
    }
    async handleDHLWebhook(payload) {
        await this.webhookService.handleDHLWebhook(payload);
        return {
            status: true,
            message: 'DHL webhook processed successfully',
        };
    }
    async handleBlockchainWebhook(payload) {
        await this.webhookService.processEventQueue(payload.events || []);
        return {
            status: true,
            message: 'Blockchain webhook processed successfully',
        };
    }
    async getWalletAddress() {
        const address = await this.thirdwebService.getWalletAddress();
        return {
            status: true,
            message: 'Wallet address retrieved successfully',
            data: { address },
        };
    }
    async getWalletBalance() {
        const balance = await this.thirdwebService.getBalance();
        return {
            status: true,
            message: 'Wallet balance retrieved successfully',
            data: { balance },
        };
    }
    async deployNFTContract(body) {
        const contractAddress = await this.thirdwebService.deployNFTContract(body.name, body.symbol, body.description);
        return {
            status: true,
            message: 'NFT contract deployed successfully',
            data: { contractAddress },
        };
    }
    async deployEscrowContract() {
        const contractAddress = await this.thirdwebService.deployEscrowContract();
        return {
            status: true,
            message: 'Escrow contract deployed successfully',
            data: { contractAddress },
        };
    }
    async getContractEvents(contractAddress, fromBlock) {
        const events = await this.webhookService.getEventLogs(contractAddress, fromBlock);
        return {
            status: true,
            message: 'Contract events retrieved successfully',
            data: events,
        };
    }
};
exports.Web3Controller = Web3Controller;
__decorate([
    (0, common_1.Post)('nft/create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "createNFT", null);
__decorate([
    (0, common_1.Post)('nft/mint'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "mintNFT", null);
__decorate([
    (0, common_1.Post)('nft/:id/list'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "listNFT", null);
__decorate([
    (0, common_1.Get)('nft/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getNFT", null);
__decorate([
    (0, common_1.Get)('nft/creator/:creatorId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('creatorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getNFTsByCreator", null);
__decorate([
    (0, common_1.Post)('escrow/create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "createEscrow", null);
__decorate([
    (0, common_1.Post)('escrow/fund'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "fundEscrow", null);
__decorate([
    (0, common_1.Post)('escrow/milestone/complete'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "completeMilestone", null);
__decorate([
    (0, common_1.Post)('escrow/milestone/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "approveMilestone", null);
__decorate([
    (0, common_1.Post)('escrow/milestone/dispute'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "disputeMilestone", null);
__decorate([
    (0, common_1.Get)('escrow/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getEscrow", null);
__decorate([
    (0, common_1.Get)('escrow/:id/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getEscrowStats", null);
__decorate([
    (0, common_1.Get)('escrow/creator/:creatorId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('creatorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getEscrowsByCreator", null);
__decorate([
    (0, common_1.Get)('escrow/maker/:makerId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('makerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getEscrowsByMaker", null);
__decorate([
    (0, common_1.Post)('qr/generate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "generateQR", null);
__decorate([
    (0, common_1.Post)('qr/verify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "generateVerificationQR", null);
__decorate([
    (0, common_1.Get)('qr/scan/:hash'),
    __param(0, (0, common_1.Param)('hash')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "scanQR", null);
__decorate([
    (0, common_1.Get)('qr/nft/:nftId'),
    __param(0, (0, common_1.Param)('nftId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getQRsByNFT", null);
__decorate([
    (0, common_1.Get)('qr/:nftId/stats'),
    __param(0, (0, common_1.Param)('nftId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getQRStats", null);
__decorate([
    (0, common_1.Post)('webhook/dhl'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "handleDHLWebhook", null);
__decorate([
    (0, common_1.Post)('webhook/blockchain'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "handleBlockchainWebhook", null);
__decorate([
    (0, common_1.Get)('wallet/address'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getWalletAddress", null);
__decorate([
    (0, common_1.Get)('wallet/balance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getWalletBalance", null);
__decorate([
    (0, common_1.Post)('contract/deploy/nft'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "deployNFTContract", null);
__decorate([
    (0, common_1.Post)('contract/deploy/escrow'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "deployEscrowContract", null);
__decorate([
    (0, common_1.Get)('events/:contractAddress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('contractAddress')),
    __param(1, (0, common_1.Query)('fromBlock')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], Web3Controller.prototype, "getContractEvents", null);
exports.Web3Controller = Web3Controller = __decorate([
    (0, common_1.Controller)('web3'),
    __metadata("design:paramtypes", [nft_service_1.NFTService,
        escrow_service_1.EscrowService,
        qr_service_1.QRService,
        webhook_service_1.WebhookService,
        thirdweb_service_1.ThirdwebService])
], Web3Controller);
//# sourceMappingURL=web3.controller.js.map