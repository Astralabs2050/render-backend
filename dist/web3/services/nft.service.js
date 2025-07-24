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
var NFTService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nft_entity_1 = require("../entities/nft.entity");
const thirdweb_service_1 = require("./thirdweb.service");
const ipfs_service_1 = require("./ipfs.service");
const qr_service_1 = require("./qr.service");
const config_1 = require("@nestjs/config");
let NFTService = NFTService_1 = class NFTService {
    constructor(nftRepository, thirdwebService, ipfsService, qrService, configService) {
        this.nftRepository = nftRepository;
        this.thirdwebService = thirdwebService;
        this.ipfsService = ipfsService;
        this.qrService = qrService;
        this.configService = configService;
        this.logger = new common_1.Logger(NFTService_1.name);
        this.defaultContractAddress = this.configService.get('NFT_CONTRACT_ADDRESS');
    }
    async createNFT(dto) {
        try {
            const nft = this.nftRepository.create({
                name: dto.name,
                description: dto.description,
                category: dto.category,
                price: dto.price,
                quantity: dto.quantity,
                imageUrl: dto.imageUrl,
                creatorId: dto.creatorId,
                chatId: dto.chatId,
                status: nft_entity_1.NFTStatus.DRAFT,
                attributes: dto.attributes || [],
            });
            const savedNFT = await this.nftRepository.save(nft);
            this.logger.log(`NFT created: ${savedNFT.id}`);
            return savedNFT;
        }
        catch (error) {
            this.logger.error(`Failed to create NFT: ${error.message}`);
            throw error;
        }
    }
    async prepareForMinting(nftId) {
        try {
            const nft = await this.findById(nftId);
            if (nft.status !== nft_entity_1.NFTStatus.DRAFT) {
                throw new Error('NFT is not in draft status');
            }
            const imageResponse = await fetch(nft.imageUrl);
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            const { metadataUri, imageUri } = await this.ipfsService.uploadDesignAssets({
                name: nft.name,
                description: nft.description,
                category: nft.category,
                price: nft.price,
                imageBuffer,
                attributes: nft.attributes,
            });
            nft.ipfsHash = this.ipfsService.extractIPFSHash(metadataUri);
            nft.ipfsUrl = metadataUri;
            nft.metadata = {
                name: nft.name,
                description: nft.description,
                image: imageUri,
                attributes: nft.attributes,
            };
            await this.nftRepository.save(nft);
            this.logger.log(`NFT prepared for minting: ${nftId}`);
            return { metadataUri, imageUri };
        }
        catch (error) {
            this.logger.error(`Failed to prepare NFT for minting: ${error.message}`);
            throw error;
        }
    }
    async mintNFT(dto) {
        try {
            const nft = await this.findById(dto.nftId);
            if (nft.status !== nft_entity_1.NFTStatus.DRAFT) {
                throw new Error('NFT is not in draft status');
            }
            if (!nft.ipfsUrl) {
                await this.prepareForMinting(dto.nftId);
                const updatedNFT = await this.findById(dto.nftId);
                Object.assign(nft, updatedNFT);
            }
            nft.status = nft_entity_1.NFTStatus.MINTING;
            await this.nftRepository.save(nft);
            const contractAddress = this.defaultContractAddress || await this.deployContract();
            const { tokenId, transactionHash } = dto.recipientAddress
                ? await this.thirdwebService.mintNFTTo(contractAddress, dto.recipientAddress, nft.metadata)
                : await this.thirdwebService.mintNFT(contractAddress, nft.metadata);
            nft.tokenId = tokenId;
            nft.contractAddress = contractAddress;
            nft.transactionHash = transactionHash;
            nft.status = nft_entity_1.NFTStatus.MINTED;
            nft.mintedAt = new Date();
            const mintedNFT = await this.nftRepository.save(nft);
            await this.qrService.generateNFTQR(mintedNFT.id);
            this.logger.log(`NFT minted successfully: ${mintedNFT.id} - Token ID: ${tokenId}`);
            return mintedNFT;
        }
        catch (error) {
            const nft = await this.findById(dto.nftId);
            nft.status = nft_entity_1.NFTStatus.DRAFT;
            await this.nftRepository.save(nft);
            this.logger.error(`NFT minting failed: ${error.message}`);
            throw error;
        }
    }
    async listNFT(nftId) {
        try {
            const nft = await this.findById(nftId);
            if (nft.status !== nft_entity_1.NFTStatus.MINTED) {
                throw new Error('NFT must be minted before listing');
            }
            nft.status = nft_entity_1.NFTStatus.LISTED;
            const listedNFT = await this.nftRepository.save(nft);
            this.logger.log(`NFT listed: ${nftId}`);
            return listedNFT;
        }
        catch (error) {
            this.logger.error(`Failed to list NFT: ${error.message}`);
            throw error;
        }
    }
    async findById(id) {
        const nft = await this.nftRepository.findOne({
            where: { id },
            relations: ['creator', 'chat'],
        });
        if (!nft) {
            throw new common_1.NotFoundException(`NFT with ID ${id} not found`);
        }
        return nft;
    }
    async findByCreator(creatorId) {
        return this.nftRepository.find({
            where: { creatorId },
            order: { createdAt: 'DESC' },
            relations: ['creator'],
        });
    }
    async findByChat(chatId) {
        return this.nftRepository.find({
            where: { chatId },
            order: { createdAt: 'DESC' },
            relations: ['creator', 'chat'],
        });
    }
    async findByStatus(status) {
        return this.nftRepository.find({
            where: { status },
            order: { createdAt: 'DESC' },
            relations: ['creator'],
        });
    }
    async updateNFT(id, updates) {
        const nft = await this.findById(id);
        Object.assign(nft, updates);
        return this.nftRepository.save(nft);
    }
    async deleteNFT(id) {
        const nft = await this.findById(id);
        if (nft.status !== nft_entity_1.NFTStatus.DRAFT) {
            throw new Error('Only draft NFTs can be deleted');
        }
        await this.nftRepository.remove(nft);
        this.logger.log(`NFT deleted: ${id}`);
    }
    async deployContract() {
        try {
            const contractAddress = await this.thirdwebService.deployNFTContract('Astra Fashion NFTs', 'ASTRA', 'Unique fashion designs minted as NFTs on the Astra platform');
            this.logger.log(`New NFT contract deployed: ${contractAddress}`);
            return contractAddress;
        }
        catch (error) {
            this.logger.error(`Contract deployment failed: ${error.message}`);
            throw error;
        }
    }
    async getContractInfo(contractAddress) {
        try {
            return {
                address: contractAddress,
                name: 'Astra Fashion NFTs',
                symbol: 'ASTRA',
                totalSupply: 0,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get contract info: ${error.message}`);
            throw error;
        }
    }
};
exports.NFTService = NFTService;
exports.NFTService = NFTService = NFTService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(nft_entity_1.NFT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        thirdweb_service_1.ThirdwebService,
        ipfs_service_1.IPFSService,
        qr_service_1.QRService,
        config_1.ConfigService])
], NFTService);
//# sourceMappingURL=nft.service.js.map