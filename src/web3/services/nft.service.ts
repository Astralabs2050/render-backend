import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface MintNFTDto {
  nftId: string;
  recipientAddress?: string;
}

@Injectable()
export class NFTService {
  private readonly logger = new Logger(NFTService.name);
  private readonly defaultContractAddress: string;

  constructor(
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
    private thirdwebService: ThirdwebService,
    private ipfsService: IPFSService,
    private qrService: QRService,
    private configService: ConfigService,
  ) {
    this.defaultContractAddress = this.configService.get<string>('NFT_CONTRACT_ADDRESS');
  }

  async createNFT(dto: CreateNFTDto): Promise<NFT> {
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
        status: NFTStatus.DRAFT,
        attributes: dto.attributes || [],
      });

      const savedNFT = await this.nftRepository.save(nft);
      this.logger.log(`NFT created: ${savedNFT.id}`);
      
      return savedNFT;
    } catch (error) {
      this.logger.error(`Failed to create NFT: ${error.message}`);
      throw error;
    }
  }

  async prepareForMinting(nftId: string): Promise<{ metadataUri: string; imageUri: string }> {
    try {
      const nft = await this.findById(nftId);
      
      if (nft.status !== NFTStatus.DRAFT) {
        throw new Error('NFT is not in draft status');
      }

      // Download image from URL
      const imageResponse = await fetch(nft.imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Upload to IPFS
      const { metadataUri, imageUri } = await this.ipfsService.uploadDesignAssets({
        name: nft.name,
        description: nft.description,
        category: nft.category,
        price: nft.price,
        imageBuffer,
        attributes: nft.attributes as Array<{ trait_type: string; value: string | number }>,
      });

      // Update NFT with IPFS data
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
    } catch (error) {
      this.logger.error(`Failed to prepare NFT for minting: ${error.message}`);
      throw error;
    }
  }

  async mintNFT(dto: MintNFTDto): Promise<NFT> {
    try {
      const nft = await this.findById(dto.nftId);
      
      if (nft.status !== NFTStatus.DRAFT) {
        throw new Error('NFT is not in draft status');
      }

      if (!nft.ipfsUrl) {
        await this.prepareForMinting(dto.nftId);
        // Reload NFT after preparation
        const updatedNFT = await this.findById(dto.nftId);
        Object.assign(nft, updatedNFT);
      }

      // Update status to minting
      nft.status = NFTStatus.MINTING;
      await this.nftRepository.save(nft);

      // Mint NFT on blockchain
      const contractAddress = this.defaultContractAddress || await this.deployContract();
      
      const { tokenId, transactionHash } = dto.recipientAddress
        ? await this.thirdwebService.mintNFTTo(contractAddress, dto.recipientAddress, nft.metadata)
        : await this.thirdwebService.mintNFT(contractAddress, nft.metadata);

      // Update NFT with minting results
      nft.tokenId = tokenId;
      nft.contractAddress = contractAddress;
      nft.transactionHash = transactionHash;
      nft.status = NFTStatus.MINTED;
      nft.mintedAt = new Date();

      const mintedNFT = await this.nftRepository.save(nft);

      // Generate QR code for the minted NFT
      await this.qrService.generateNFTQR(mintedNFT.id);

      this.logger.log(`NFT minted successfully: ${mintedNFT.id} - Token ID: ${tokenId}`);
      return mintedNFT;
    } catch (error) {
      // Update status back to draft on failure
      const nft = await this.findById(dto.nftId);
      nft.status = NFTStatus.DRAFT;
      await this.nftRepository.save(nft);

      this.logger.error(`NFT minting failed: ${error.message}`);
      throw error;
    }
  }

  async listNFT(nftId: string): Promise<NFT> {
    try {
      const nft = await this.findById(nftId);
      
      if (nft.status !== NFTStatus.MINTED) {
        throw new Error('NFT must be minted before listing');
      }

      nft.status = NFTStatus.LISTED;
      const listedNFT = await this.nftRepository.save(nft);

      this.logger.log(`NFT listed: ${nftId}`);
      return listedNFT;
    } catch (error) {
      this.logger.error(`Failed to list NFT: ${error.message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<NFT> {
    const nft = await this.nftRepository.findOne({
      where: { id },
      relations: ['creator', 'chat'],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with ID ${id} not found`);
    }

    return nft;
  }

  async findByCreator(creatorId: string): Promise<NFT[]> {
    return this.nftRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
      relations: ['creator'],
    });
  }

  async findByChat(chatId: string): Promise<NFT[]> {
    return this.nftRepository.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
      relations: ['creator', 'chat'],
    });
  }

  async findByStatus(status: NFTStatus): Promise<NFT[]> {
    return this.nftRepository.find({
      where: { status },
      order: { createdAt: 'DESC' },
      relations: ['creator'],
    });
  }

  async updateNFT(id: string, updates: Partial<NFT>): Promise<NFT> {
    const nft = await this.findById(id);
    Object.assign(nft, updates);
    return this.nftRepository.save(nft);
  }

  async deleteNFT(id: string): Promise<void> {
    const nft = await this.findById(id);
    
    if (nft.status !== NFTStatus.DRAFT) {
      throw new Error('Only draft NFTs can be deleted');
    }

    await this.nftRepository.remove(nft);
    this.logger.log(`NFT deleted: ${id}`);
  }

  private async deployContract(): Promise<string> {
    try {
      const contractAddress = await this.thirdwebService.deployNFTContract(
        'Astra Fashion NFTs',
        'ASTRA',
        'Unique fashion designs minted as NFTs on the Astra platform'
      );

      this.logger.log(`New NFT contract deployed: ${contractAddress}`);
      return contractAddress;
    } catch (error) {
      this.logger.error(`Contract deployment failed: ${error.message}`);
      throw error;
    }
  }

  async getContractInfo(contractAddress: string): Promise<any> {
    try {
      // This would typically fetch contract metadata
      return {
        address: contractAddress,
        name: 'Astra Fashion NFTs',
        symbol: 'ASTRA',
        totalSupply: 0, // Would be fetched from contract
      };
    } catch (error) {
      this.logger.error(`Failed to get contract info: ${error.message}`);
      throw error;
    }
  }
}