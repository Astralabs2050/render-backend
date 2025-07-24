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
var ThirdwebService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThirdwebService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_1 = require("@thirdweb-dev/sdk");
const ethers_1 = require("ethers");
let ThirdwebService = ThirdwebService_1 = class ThirdwebService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ThirdwebService_1.name);
        this.chainId = this.configService.get('THIRDWEB_CHAIN_ID', 137);
        this.privateKey = this.configService.get('THIRDWEB_PRIVATE_KEY');
        this.initializeSDK();
    }
    async initializeSDK() {
        try {
            if (!this.privateKey) {
                this.logger.warn('Thirdweb private key not configured');
                return;
            }
            this.sdk = sdk_1.ThirdwebSDK.fromPrivateKey(this.privateKey, this.chainId);
            this.logger.log(`Thirdweb SDK initialized for chain ${this.chainId}`);
        }
        catch (error) {
            this.logger.error(`Failed to initialize Thirdweb SDK: ${error.message}`);
        }
    }
    async uploadToIPFS(data) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const uri = await this.sdk.storage.upload(data);
            this.logger.log(`Uploaded to IPFS: ${uri}`);
            return uri;
        }
        catch (error) {
            this.logger.error(`IPFS upload failed: ${error.message}`);
            throw error;
        }
    }
    async uploadFileToIPFS(file, fileName) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const fileData = {
                data: file,
                name: fileName,
            };
            const uri = await this.sdk.storage.upload(fileData);
            this.logger.log(`File uploaded to IPFS: ${uri}`);
            return uri;
        }
        catch (error) {
            this.logger.error(`File IPFS upload failed: ${error.message}`);
            throw error;
        }
    }
    async mintNFT(contractAddress, metadata) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const contract = await this.sdk.getContract(contractAddress);
            const tx = await contract.erc721.mint(metadata);
            this.logger.log(`NFT minted: ${tx.id} - ${tx.receipt.transactionHash}`);
            return {
                tokenId: tx.id.toString(),
                transactionHash: tx.receipt.transactionHash,
            };
        }
        catch (error) {
            this.logger.error(`NFT minting failed: ${error.message}`);
            throw error;
        }
    }
    async mintNFTTo(contractAddress, to, metadata) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const contract = await this.sdk.getContract(contractAddress);
            const tx = await contract.erc721.mintTo(to, metadata);
            this.logger.log(`NFT minted to ${to}: ${tx.id} - ${tx.receipt.transactionHash}`);
            return {
                tokenId: tx.id.toString(),
                transactionHash: tx.receipt.transactionHash,
            };
        }
        catch (error) {
            this.logger.error(`NFT minting to address failed: ${error.message}`);
            throw error;
        }
    }
    async deployNFTContract(name, symbol, description) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const contractAddress = await this.sdk.deployer.deployNFTCollection({
                name,
                symbol,
                description,
                primary_sale_recipient: await this.sdk.wallet.getAddress(),
                fee_recipient: await this.sdk.wallet.getAddress(),
                seller_fee_basis_points: 250,
            });
            this.logger.log(`NFT contract deployed: ${contractAddress}`);
            return contractAddress;
        }
        catch (error) {
            this.logger.error(`Contract deployment failed: ${error.message}`);
            throw error;
        }
    }
    async deployEscrowContract() {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const contractAddress = await this.sdk.deployer.deployBuiltInContract('marketplace-v3', {
                name: 'Astra Fashion Marketplace',
                description: 'Decentralized fashion marketplace with escrow',
            });
            this.logger.log(`Escrow contract deployed: ${contractAddress}`);
            return contractAddress;
        }
        catch (error) {
            this.logger.error(`Escrow contract deployment failed: ${error.message}`);
            throw error;
        }
    }
    async getContractEvents(contractAddress, eventName, fromBlock) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const contract = await this.sdk.getContract(contractAddress);
            const events = await contract.events.getEvents(eventName, {
                fromBlock: fromBlock || 'earliest',
            });
            return events;
        }
        catch (error) {
            this.logger.error(`Failed to get contract events: ${error.message}`);
            throw error;
        }
    }
    async listenToContractEvents(contractAddress, eventName, callback) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const contract = await this.sdk.getContract(contractAddress);
            contract.events.addEventListener(eventName, callback);
            this.logger.log(`Listening to ${eventName} events on ${contractAddress}`);
        }
        catch (error) {
            this.logger.error(`Failed to listen to contract events: ${error.message}`);
            throw error;
        }
    }
    async getWalletAddress() {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            return await this.sdk.wallet.getAddress();
        }
        catch (error) {
            this.logger.error(`Failed to get wallet address: ${error.message}`);
            throw error;
        }
    }
    async getBalance() {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const balance = await this.sdk.wallet.balance();
            return ethers_1.ethers.utils.formatEther(balance.value);
        }
        catch (error) {
            this.logger.error(`Failed to get balance: ${error.message}`);
            throw error;
        }
    }
};
exports.ThirdwebService = ThirdwebService;
exports.ThirdwebService = ThirdwebService = ThirdwebService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ThirdwebService);
//# sourceMappingURL=thirdweb.service.js.map