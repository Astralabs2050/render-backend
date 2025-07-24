import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { ethers } from 'ethers';

@Injectable()
export class ThirdwebService {
  private readonly logger = new Logger(ThirdwebService.name);
  private sdk: ThirdwebSDK;
  private readonly chainId: number;
  private readonly privateKey: string;

  constructor(private configService: ConfigService) {
    this.chainId = this.configService.get<number>('THIRDWEB_CHAIN_ID', 137); // Polygon by default
    this.privateKey = this.configService.get<string>('THIRDWEB_PRIVATE_KEY');
    
    this.initializeSDK();
  }

  private async initializeSDK() {
    try {
      if (!this.privateKey) {
        this.logger.warn('Thirdweb private key not configured');
        return;
      }

      this.sdk = ThirdwebSDK.fromPrivateKey(this.privateKey, this.chainId);
      this.logger.log(`Thirdweb SDK initialized for chain ${this.chainId}`);
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
        primary_sale_recipient: await this.sdk.wallet.getAddress(),
        fee_recipient: await this.sdk.wallet.getAddress(),
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

      // Deploy a custom escrow contract
      // This would typically be a pre-built contract or custom smart contract
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
}