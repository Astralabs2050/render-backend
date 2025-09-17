import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NFT, NFTStatus } from '../entities/nft.entity';
import { User } from '../../users/entities/user.entity';
import { ThirdwebService } from './thirdweb.service';
import { IPFSService } from './ipfs.service';
import { QRService } from './qr.service';
import { ConfigService } from '@nestjs/config';
import { TransactionHashValidatorService } from './transaction-hash-validator.service';
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

export interface PaymentVerificationResult {
  isValid: boolean;
  transactionHash: string;
  amount: number;
  status: 'confirmed' | 'pending' | 'failed';
  errors?: string[];
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
    private transactionHashValidator: TransactionHashValidatorService,
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
      const imageResponse = await fetch(nft.imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const { metadataUri, imageUri } = await this.ipfsService.uploadDesignAssets({
        name: nft.name,
        description: nft.description,
        category: nft.category,
        price: nft.price,
        imageBuffer,
        attributes: nft.attributes as Array<{ trait_type: string; value: string | number }>,
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
        const updatedNFT = await this.findById(dto.nftId);
        Object.assign(nft, updatedNFT);
      }
      nft.status = NFTStatus.MINTING;
      await this.nftRepository.save(nft);
      const contractAddress = this.defaultContractAddress || await this.deployContract();
      const { tokenId, transactionHash } = dto.recipientAddress
        ? await this.thirdwebService.mintNFTTo(contractAddress, dto.recipientAddress, nft.metadata)
        : await this.thirdwebService.mintNFT(contractAddress, nft.metadata);
      nft.tokenId = tokenId;
      nft.contractAddress = contractAddress;
      nft.transactionHash = transactionHash;
      nft.status = NFTStatus.MINTED;
      nft.mintedAt = new Date();
      const mintedNFT = await this.nftRepository.save(nft);
      await this.qrService.generateNFTQR(mintedNFT.id);
      this.logger.log(`NFT minted successfully: ${mintedNFT.id} - Token ID: ${tokenId}`);
      return mintedNFT;
    } catch (error) {
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
  async mintFromChatDesign(userId: string, chatId: string, selectedVariation: string, paymentTransactionHash: string): Promise<NFT> {
    try {
      this.logger.log(`Minting design from chat: ${chatId}, variation: ${selectedVariation}`);
      
      // Validate transaction hash format
      const validationResult = this.transactionHashValidator.validateFormat(paymentTransactionHash);
      if (!validationResult.isValid) {
        const userFriendlyError = this.transactionHashValidator.getUserFriendlyError(validationResult);
        this.logger.error(`Transaction hash validation failed: ${validationResult.errors.join(', ')}`);
        throw new Error(userFriendlyError);
      }

      this.logger.log(`Transaction hash validation successful: ${validationResult.normalizedHash?.substring(0, 10)}...`);
      
      // Get user wallet for payment verification using TypeORM repository
      const userRepository = this.nftRepository.manager.getRepository('User');
      const user = await userRepository.findOne({
        where: { id: userId },
        select: ['walletAddress']
      });
      
      if (!user || !user.walletAddress) {
        throw new Error('User wallet not found');
      }
      
      // Verify payment was successful using existing Thirdweb service
      const paymentVerification = await this.verifyPayment({
        transactionHash: validationResult.normalizedHash!,
        fromAddress: user.walletAddress,
        expectedAmount: 50, // Minting fee
        collectionId: chatId
      });
      
      if (!paymentVerification.isValid) {
        const errorMessage = paymentVerification.errors?.join(', ') || 'Payment verification failed';
        this.logger.error(`Payment verification failed: ${errorMessage}`);
        throw new Error(`Payment verification failed: ${errorMessage}`);
      }
      
      this.logger.log(`Payment verified successfully: ${paymentVerification.transactionHash} - Status: ${paymentVerification.status}`);
      
      // Get chat and design previews
      const chat = await this.nftRepository.manager.query(
        'SELECT * FROM ai_chats WHERE id = $1 AND ("userId" = $2 OR "creatorId" = $2)',
        [chatId, userId]
      );
      
      if (!chat || !chat[0]) {
        throw new Error('Chat not found or access denied');
      }
      
      const chatData = chat[0];
      let designPreviews: string[] = [];
      try {
        if (Array.isArray(chatData.designPreviews)) {
          designPreviews = chatData.designPreviews as string[];
        } else if (typeof chatData.designPreviews === 'string') {
          // Handle JSON string or comma-separated storage
          const str = chatData.designPreviews as string;
          if (str.trim().startsWith('[')) {
            designPreviews = JSON.parse(str);
          } else if (str.length) {
            designPreviews = str.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to parse designPreviews for chat ${chatId}: ${e?.message}`);
      }
      
      if (designPreviews.length === 0) {
        throw new Error('No design previews found in chat. Please generate designs first.');
      }
      
      // Extract variation number and get image URL
      const variationIndex = parseInt((selectedVariation || '').split('_')[1]) - 1;
      const selectedImageUrl = designPreviews[variationIndex];
      
      if (!selectedImageUrl) {
        throw new Error('Selected design variation not found');
      }
      
      // Generate design name from chat messages
      const messages = await this.nftRepository.manager.query(
        'SELECT content FROM ai_chat_messages WHERE "chatId" = $1 AND role = $2 ORDER BY "createdAt"',
        [chatId, 'user']
      );
      
      const userMessages = messages.map(m => m.content).join(' ');
      const designName = `Custom Design - ${userMessages.substring(0, 50)}...`;
      
      // Create NFT with payment info
      const nft = await this.createNFT({
        name: designName,
        description: `Custom fashion design created through AI chat`,
        category: 'AI Generated Design',
        price: 50, // Minting fee 
        quantity: 1,
        imageUrl: selectedImageUrl,
        creatorId: userId,
        chatId: chatId,
      });
      
      // Store normalized payment transaction hash
      nft.transactionHash = validationResult.normalizedHash;
      
      // Mint the NFT
      const mintedNFT = await this.mintNFT({ nftId: nft.id });
      
      // Update chat state
      await this.nftRepository.manager.query(
        'UPDATE ai_chats SET "nftId" = $1, state = $2 WHERE id = $3',
        [mintedNFT.id, 'design_approved', chatId]
      );
      
      this.logger.log(`Design minted successfully from chat: ${mintedNFT.id}`);
      return mintedNFT;
      
    } catch (error) {
      this.logger.error(`Failed to mint from chat design: ${error.message}`);
      throw error;
    }
  }

  async getContractInfo(contractAddress: string): Promise<any> {
    try {
      return {
        address: contractAddress,
        name: 'Astra Fashion NFTs',
        symbol: 'ASTRA',
        totalSupply: 0, 
      };
    } catch (error) {
      this.logger.error(`Failed to get contract info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifies payment transaction with enhanced error handling
   */
  private async verifyPayment(params: {
    transactionHash: string;
    fromAddress: string;
    expectedAmount: number;
    collectionId: string;
  }): Promise<PaymentVerificationResult> {
    try {
      this.logger.log(`Verifying payment transaction: ${params.transactionHash.substring(0, 10)}...`);

      // Check payment status using Thirdweb service
      const paymentStatus = await this.thirdwebService.checkPaymentStatus({
        fromAddress: params.fromAddress,
        amount: params.expectedAmount,
        collectionId: params.collectionId
      });

      if (!paymentStatus) {
        return {
          isValid: false,
          transactionHash: params.transactionHash,
          amount: params.expectedAmount,
          status: 'failed',
          errors: ['Transaction not found on blockchain', 'Please verify the transaction hash and try again']
        };
      }

      // Additional validation could be added here:
      // - Check transaction confirmations
      // - Verify transaction amount matches expected amount
      // - Check transaction status (success/failed)
      // - Verify sender address matches user wallet

      return {
        isValid: true,
        transactionHash: paymentStatus.transactionHash,
        amount: params.expectedAmount,
        status: 'confirmed',
      };

    } catch (error) {
      this.logger.error(`Payment verification error: ${error.message}`);
      
      // Handle specific blockchain errors
      if (error.message.includes('network')) {
        return {
          isValid: false,
          transactionHash: params.transactionHash,
          amount: params.expectedAmount,
          status: 'failed',
          errors: ['Network error while verifying payment', 'Please check your internet connection and try again']
        };
      }

      if (error.message.includes('timeout')) {
        return {
          isValid: false,
          transactionHash: params.transactionHash,
          amount: params.expectedAmount,
          status: 'pending',
          errors: ['Payment verification timed out', 'Transaction may still be processing, please try again in a few minutes']
        };
      }

      return {
        isValid: false,
        transactionHash: params.transactionHash,
        amount: params.expectedAmount,
        status: 'failed',
        errors: ['Payment verification failed', error.message]
      };
    }
  }
}