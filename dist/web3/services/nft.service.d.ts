import { Repository } from 'typeorm';
import { NFT, NFTStatus } from '../entities/nft.entity';
import { ThirdwebService } from './thirdweb.service';
import { IPFSService } from './ipfs.service';
import { QRService } from './qr.service';
import { ConfigService } from '@nestjs/config';
export interface CreateNFTDto {
    name: string;
    description: string;
    category: string;
    price: number;
    quantity: number;
    imageUrl: string;
    creatorId: string;
    chatId?: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
}
export interface MintNFTDto {
    nftId: string;
    recipientAddress?: string;
}
export declare class NFTService {
    private nftRepository;
    private thirdwebService;
    private ipfsService;
    private qrService;
    private configService;
    private readonly logger;
    private readonly defaultContractAddress;
    constructor(nftRepository: Repository<NFT>, thirdwebService: ThirdwebService, ipfsService: IPFSService, qrService: QRService, configService: ConfigService);
    createNFT(dto: CreateNFTDto): Promise<NFT>;
    prepareForMinting(nftId: string): Promise<{
        metadataUri: string;
        imageUri: string;
    }>;
    mintNFT(dto: MintNFTDto): Promise<NFT>;
    listNFT(nftId: string): Promise<NFT>;
    findById(id: string): Promise<NFT>;
    findByCreator(creatorId: string): Promise<NFT[]>;
    findByChat(chatId: string): Promise<NFT[]>;
    findByStatus(status: NFTStatus): Promise<NFT[]>;
    updateNFT(id: string, updates: Partial<NFT>): Promise<NFT>;
    deleteNFT(id: string): Promise<void>;
    private deployContract;
    getContractInfo(contractAddress: string): Promise<any>;
}
