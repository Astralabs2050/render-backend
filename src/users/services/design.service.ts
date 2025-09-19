import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NFT } from '../../web3/entities/nft.entity';
import { CreateDesignInventoryDto } from '../dto/create-design-inventory.dto';

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
  ) {}

  async getCreatorInventory(creatorId: string): Promise<CreateDesignInventoryDto[]> {
    try {
      this.logger.log(`Searching inventory for creatorId: ${creatorId}`);
      
      // Check all NFTs to debug
      const allNFTs = await this.nftRepository.find({
        select: ['id', 'name', 'creatorId', 'status'],
        order: { createdAt: 'DESC' }
      });
      this.logger.log(`Total NFTs in database: ${allNFTs.length}`);
      allNFTs.forEach(nft => {
        this.logger.log(`NFT: ${nft.id}, creatorId: ${nft.creatorId}, status: ${nft.status}`);
      });
      
      const designs = await this.nftRepository.find({
        where: { creatorId },
        select: [
          'id',
          'name',
          'price',
          'quantity',
          'status',
          'imageUrl',
          'createdAt',
          'updatedAt'
        ],
        order: { updatedAt: 'DESC' }
      });

      if (designs.length === 0) {
        this.logger.log(`No designs found for creator: ${creatorId}`);
        return [];
      }

      this.logger.log(`Found ${designs.length} designs for creator: ${creatorId}`);

      return designs.map(design => ({
        id: design.id,
        name: design.name,
        price: design.price,
        quantity: design.quantity,
        publishedStatus: design.status,
        designLink: design.imageUrl,
        lastUpdated: design.updatedAt
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch creator inventory: ${error.message}`, error.stack);
      throw new NotFoundException('Failed to fetch creator inventory');
    }
  }

  async getInventoryById(designId: string, creatorId: string): Promise<CreateDesignInventoryDto | null> {
    try {
      const design = await this.nftRepository.findOne({
        where: { 
          id: designId,
          creatorId: creatorId
        },
        select: [
          'id',
          'name',
          'price',
          'quantity',
          'status',
          'imageUrl',
          'updatedAt'
        ]
      });

      if (!design) {
        this.logger.log(`Design not found or does not belong to creator: ${designId}`);
        return null;
      }

      this.logger.log(`Found inventory item: ${design.name} (ID: ${designId}) for creator: ${creatorId}`);

      return {
        id: design.id,
        name: design.name,
        price: design.price || 0,
        quantity: design.quantity || 0,
        publishedStatus: design.status,
        designLink: design.imageUrl,
        lastUpdated: design.updatedAt
      };
    } catch (error) {
      this.logger.error(`Failed to fetch inventory by ID: ${error.message}`, error.stack);
      throw new NotFoundException('Failed to fetch inventory item');
    }
  }

  async getDesignById(designId: string): Promise<NFT | null> {
    try {
      const design = await this.nftRepository.findOne({
        where: { id: designId },
        select: [
          'id',
          'name',
          'creatorId',
          'imageUrl',
          'status'
        ]
      });

      if (!design) {
        this.logger.log(`Design not found: ${designId}`);
        return null;
      }

      this.logger.log(`Found design: ${design.name} (ID: ${designId})`);
      return design;
    } catch (error) {
      this.logger.error(`Failed to fetch design by ID: ${error.message}`, error.stack);
      throw new NotFoundException('Failed to fetch design');
    }
  }
}
