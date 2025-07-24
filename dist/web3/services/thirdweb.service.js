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
const ethers = require("ethers");
let ThirdwebService = ThirdwebService_1 = class ThirdwebService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ThirdwebService_1.name);
        this.clientId = this.configService.get('THIRDWEB_CLIENT_ID');
        this.secretKey = this.configService.get('THIRDWEB_SECRET_KEY');
        this.chain = this.configService.get('THIRDWEB_CHAIN_ID', '137');
        this.initializeSDK();
    }
    async initializeSDK() {
        try {
            if (!this.clientId || !this.secretKey) {
                this.logger.warn('Thirdweb client ID or secret key not configured');
                return;
            }
            this.sdk = new sdk_1.ThirdwebSDK(this.chain, {
                clientId: this.clientId,
                secretKey: this.secretKey,
            });
            this.logger.log(`Thirdweb SDK initialized for chain ${this.chain} with client ID: ${this.clientId.substring(0, 8)}...`);
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
                primary_sale_recipient: await this.getWalletAddress(),
                fee_recipient: await this.getWalletAddress(),
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
            return ethers.utils.formatEther(balance.value);
        }
        catch (error) {
            this.logger.error(`Failed to get balance: ${error.message}`);
            throw error;
        }
    }
    async getWalletBalance(address) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const provider = this.sdk.getProvider();
            const balance = await provider.getBalance(address);
            return ethers.utils.formatEther(balance);
        }
        catch (error) {
            this.logger.error(`Failed to get wallet balance for ${address}: ${error.message}`);
            throw error;
        }
    }
    async generateWallet() {
        try {
            const wallet = ethers.Wallet.createRandom();
            this.logger.log(`Generated new wallet: ${wallet.address}`);
            return {
                address: wallet.address,
                privateKey: wallet.privateKey,
            };
        }
        catch (error) {
            this.logger.error(`Failed to generate wallet: ${error.message}`);
            throw error;
        }
    }
    async createUserWalletSDK(encryptedPrivateKey) {
        try {
            const { Helpers } = await Promise.resolve().then(() => require('../../common/utils/helpers'));
            const privateKey = Helpers.decryptPrivateKey(encryptedPrivateKey);
            const userSDK = sdk_1.ThirdwebSDK.fromPrivateKey(privateKey, this.chain, {
                clientId: this.clientId,
            });
            this.logger.log('Created user wallet SDK');
            return userSDK;
        }
        catch (error) {
            this.logger.error(`Failed to create user wallet SDK: ${error.message}`);
            throw error;
        }
    }
    async connectUserWallet(encryptedPrivateKey) {
        try {
            const userSDK = await this.createUserWalletSDK(encryptedPrivateKey);
            const address = await userSDK.wallet.getAddress();
            const balance = await this.getWalletBalance(address);
            return { address, balance };
        }
        catch (error) {
            this.logger.error(`Failed to connect user wallet: ${error.message}`);
            throw error;
        }
    }
    async getUserNFTs(userAddress, contractAddress) {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            if (contractAddress) {
                const contract = await this.sdk.getContract(contractAddress);
                const nfts = await contract.erc721.getOwned(userAddress);
                return nfts;
            }
            else {
                this.logger.warn('Getting all NFTs across contracts not implemented');
                return [];
            }
        }
        catch (error) {
            this.logger.error(`Failed to get user NFTs: ${error.message}`);
            throw error;
        }
    }
    async getChainInfo() {
        try {
            if (!this.sdk) {
                throw new Error('Thirdweb SDK not initialized');
            }
            const provider = this.sdk.getProvider();
            const network = await provider.getNetwork();
            return {
                chainId: network.chainId,
                name: network.name,
                blockNumber: await provider.getBlockNumber(),
            };
        }
        catch (error) {
            this.logger.error(`Failed to get chain info: ${error.message}`);
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