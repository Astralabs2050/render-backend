import { NFTService, CreateNFTDto, MintNFTDto } from '../services/nft.service';
import { EscrowService, CreateEscrowDto, FundEscrowDto, ReleaseMilestoneDto } from '../services/escrow.service';
import { QRService, CreateQRDto } from '../services/qr.service';
import { WebhookService, DHLWebhookPayload } from '../services/webhook.service';
import { ThirdwebService } from '../services/thirdweb.service';
export declare class Web3Controller {
    private readonly nftService;
    private readonly escrowService;
    private readonly qrService;
    private readonly webhookService;
    private readonly thirdwebService;
    constructor(nftService: NFTService, escrowService: EscrowService, qrService: QRService, webhookService: WebhookService, thirdwebService: ThirdwebService);
    createNFT(req: any, dto: CreateNFTDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/nft.entity").NFT;
    }>;
    mintNFT(dto: MintNFTDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/nft.entity").NFT;
    }>;
    listNFT(id: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/nft.entity").NFT;
    }>;
    getNFT(id: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/nft.entity").NFT;
    }>;
    getNFTsByCreator(creatorId: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/nft.entity").NFT[];
    }>;
    createEscrow(req: any, dto: CreateEscrowDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowContract;
    }>;
    fundEscrow(dto: FundEscrowDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowContract;
    }>;
    completeMilestone(body: {
        milestoneId: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowMilestone;
    }>;
    approveMilestone(dto: ReleaseMilestoneDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowMilestone;
    }>;
    disputeMilestone(body: {
        milestoneId: string;
        reason: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowMilestone;
    }>;
    getEscrow(id: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowContract;
    }>;
    getEscrowStats(id: string): Promise<{
        status: boolean;
        message: string;
        data: {
            totalMilestones: number;
            completedMilestones: number;
            approvedMilestones: number;
            releasedAmount: number;
            remainingAmount: number;
            progressPercentage: number;
        };
    }>;
    getEscrowsByCreator(creatorId: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowContract[];
    }>;
    getEscrowsByMaker(makerId: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/escrow.entity").EscrowContract[];
    }>;
    generateQR(req: any, dto: CreateQRDto): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/qr.entity").QRCode;
    }>;
    generateVerificationQR(req: any, body: {
        nftId: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/qr.entity").QRCode;
    }>;
    scanQR(hash: string): Promise<{
        status: boolean;
        message: string;
        data: {
            qrCode: import("../entities/qr.entity").QRCode;
            isValid: boolean;
        };
    }>;
    getQRsByNFT(nftId: string): Promise<{
        status: boolean;
        message: string;
        data: import("../entities/qr.entity").QRCode[];
    }>;
    getQRStats(nftId: string): Promise<{
        status: boolean;
        message: string;
        data: {
            totalScans: number;
            uniqueQRs: number;
            lastScanned: Date | null;
            activeQRs: number;
        };
    }>;
    handleDHLWebhook(payload: DHLWebhookPayload): Promise<{
        status: boolean;
        message: string;
    }>;
    handleBlockchainWebhook(payload: any): Promise<{
        status: boolean;
        message: string;
    }>;
    getWalletAddress(): Promise<{
        status: boolean;
        message: string;
        data: {
            address: string;
        };
    }>;
    getWalletBalance(): Promise<{
        status: boolean;
        message: string;
        data: {
            balance: string;
        };
    }>;
    deployNFTContract(body: {
        name: string;
        symbol: string;
        description: string;
    }): Promise<{
        status: boolean;
        message: string;
        data: {
            contractAddress: string;
        };
    }>;
    deployEscrowContract(): Promise<{
        status: boolean;
        message: string;
        data: {
            contractAddress: string;
        };
    }>;
    getContractEvents(contractAddress: string, fromBlock?: number): Promise<{
        status: boolean;
        message: string;
        data: import("../services/webhook.service").BlockchainEvent[];
    }>;
}
