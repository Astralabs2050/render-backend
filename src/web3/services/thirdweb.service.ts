import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import * as ethers from 'ethers';

@Injectable()
export class ThirdwebService {
  private readonly logger = new Logger(ThirdwebService.name);
  private sdk: ThirdwebSDK;
  private readonly clientId: string;
  private readonly secretKey: string;
  private readonly chain: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('THIRDWEB_CLIENT_ID');
    this.secretKey = this.configService.get<string>('THIRDWEB_SECRET_KEY');
    this.chain = this.configService.get<string>('THIRDWEB_CHAIN_ID', '137'); // Polygon by default
    
    this.initializeSDK();
  }

  private async initializeSDK() {
    try {
      if (!this.clientId || !this.secretKey) {
        this.logger.warn('Thirdweb client ID or secret key not configured');
        return;
      }

      // Initialize SDK in read-only mode first, then add auth for transactions
      this.sdk = new ThirdwebSDK(this.chain, {
        clientId: this.clientId,
        secretKey: this.secretKey,
      });

      this.logger.log(`Thirdweb SDK initialized for chain ${this.chain} with client ID: ${this.clientId.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to initialize Thirdweb SDK: ${error.message}`);
    }
  }

  async uploadToIPFS(data: any): Promise<string> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      const uri = await this.sdk.storage.upload(data);
      this.logger.log(`Uploaded to IPFS: ${uri}`);
      return uri;
    } catch (error) {
      this.logger.error(`IPFS upload failed: ${error.message}`);
      throw error;
    }
  }

  async uploadFileToIPFS(file: Buffer, fileName: string): Promise<string> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      // Create file-like object for upload
      const fileData = {
        data: file,
        name: fileName,
      };

      const uri = await this.sdk.storage.upload(fileData);
      this.logger.log(`File uploaded to IPFS: ${uri}`);
      return uri;
    } catch (error) {
      this.logger.error(`File IPFS upload failed: ${error.message}`);
      throw error;
    }
  }

  async mintNFT(contractAddress: string, metadata: any): Promise<{ tokenId: string; transactionHash: string }> {
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
    } catch (error) {
      this.logger.error(`NFT minting failed: ${error.message}`);
      throw error;
    }
  }

  async mintNFTTo(contractAddress: string, to: string, metadata: any): Promise<{ tokenId: string; transactionHash: string }> {
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
    } catch (error) {
      this.logger.error(`NFT minting to address failed: ${error.message}`);
      throw error;
    }
  }

  async deployNFTContract(name: string, symbol: string, description: string): Promise<string> {
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
        seller_fee_basis_points: 250, // 2.5% royalty
      });

      this.logger.log(`NFT contract deployed: ${contractAddress}`);
      return contractAddress;
    } catch (error) {
      this.logger.error(`Contract deployment failed: ${error.message}`);
      throw error;
    }
  }

  async deployEscrowContract(): Promise<string> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      // Deploy a marketplace contract for escrow functionality
      const contractAddress = await this.sdk.deployer.deployBuiltInContract('marketplace-v3', {
        name: 'Astra Fashion Marketplace',
        description: 'Decentralized fashion marketplace with escrow',
      });

      this.logger.log(`Escrow contract deployed: ${contractAddress}`);
      return contractAddress;
    } catch (error) {
      this.logger.error(`Escrow contract deployment failed: ${error.message}`);
      throw error;
    }
  }

  async getContractEvents(contractAddress: string, eventName: string, fromBlock?: number): Promise<any[]> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      const contract = await this.sdk.getContract(contractAddress);
      const events = await contract.events.getEvents(eventName, {
        fromBlock: fromBlock || 'earliest',
      });

      return events;
    } catch (error) {
      this.logger.error(`Failed to get contract events: ${error.message}`);
      throw error;
    }
  }

  async listenToContractEvents(contractAddress: string, eventName: string, callback: (event: any) => void): Promise<void> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      const contract = await this.sdk.getContract(contractAddress);
      contract.events.addEventListener(eventName, callback);

      this.logger.log(`Listening to ${eventName} events on ${contractAddress}`);
    } catch (error) {
      this.logger.error(`Failed to listen to contract events: ${error.message}`);
      throw error;
    }
  }

  async getWalletAddress(): Promise<string> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      return await this.sdk.wallet.getAddress();
    } catch (error) {
      this.logger.error(`Failed to get wallet address: ${error.message}`);
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      const balance = await this.sdk.wallet.balance();
      return ethers.utils.formatEther(balance.value);
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      throw error;
    }
  }

  async getWalletBalance(address: string): Promise<string> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      const provider = this.sdk.getProvider();
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      this.logger.error(`Failed to get wallet balance for ${address}: ${error.message}`);
      throw error;
    }
  }

  async generateWallet(): Promise<{ address: string; privateKey: string }> {
    try {
      // Generate a new random wallet
      const wallet = ethers.Wallet.createRandom();
      
      this.logger.log(`Generated new wallet: ${wallet.address}`);
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      this.logger.error(`Failed to generate wallet: ${error.message}`);
      throw error;
    }
  }

  async createUserWalletSDK(encryptedPrivateKey: string): Promise<ThirdwebSDK> {
    try {
      const { Helpers } = await import('../../common/utils/helpers');
      const privateKey = Helpers.decryptPrivateKey(encryptedPrivateKey);
      
      // Create SDK instance with user's private key
      const userSDK = ThirdwebSDK.fromPrivateKey(privateKey, this.chain, {
        clientId: this.clientId,
      });
      
      this.logger.log('Created user wallet SDK');
      return userSDK;
    } catch (error) {
      this.logger.error(`Failed to create user wallet SDK: ${error.message}`);
      throw error;
    }
  }

  async connectUserWallet(encryptedPrivateKey: string): Promise<{ address: string; balance: string }> {
    try {
      const userSDK = await this.createUserWalletSDK(encryptedPrivateKey);
      const address = await userSDK.wallet.getAddress();
      const balance = await this.getWalletBalance(address);

      return { address, balance };
    } catch (error) {
      this.logger.error(`Failed to connect user wallet: ${error.message}`);
      throw error;
    }
  }

  async getUserNFTs(userAddress: string, contractAddress?: string): Promise<any[]> {
    try {
      if (!this.sdk) {
        throw new Error('Thirdweb SDK not initialized');
      }

      if (contractAddress) {
        // Get NFTs from specific contract
        const contract = await this.sdk.getContract(contractAddress);
        const nfts = await contract.erc721.getOwned(userAddress);
        return nfts;
      } else {
        // This would require additional implementation to get all NFTs across contracts
        this.logger.warn('Getting all NFTs across contracts not implemented');
        return [];
      }
    } catch (error) {
      this.logger.error(`Failed to get user NFTs: ${error.message}`);
      throw error;
    }
  }

  async getChainInfo(): Promise<any> {
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
    } catch (error) {
      this.logger.error(`Failed to get chain info: ${error.message}`);
      throw error;
    }
  }
}