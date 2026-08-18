import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignRecord } from '../../designs/entities/design-record.entity';
import { CreateDesignInventoryDto } from '../dto/create-design-inventory.dto';

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    @InjectRepository(DesignRecord)
    private designRepository: Repository<DesignRecord>,
  ) {}

  async getCreatorInventory(creatorId: string): Promise<CreateDesignInventoryDto[]> {
    try {
      const designs = await this.designRepository.find({
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
      const design = await this.designRepository.findOne({
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

  async getDesignPublic(designId: string): Promise<CreateDesignInventoryDto | null> {
    try {
      const design = await this.designRepository.findOne({
        where: { id: designId },
        relations: ['creator'],
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          status: true,
          imageUrl: true,
          updatedAt: true,
          creator: {
            id: true,
            fullName: true,
            profilePicture: true,
          }
        }
      });

      if (!design) {
        this.logger.log(`Design not found: ${designId}`);
        return null;
      }

      this.logger.log(`Found design: ${design.name} (ID: ${designId})`);

      return {
        id: design.id,
        name: design.name,
        price: design.price || 0,
        quantity: design.quantity || 0,
        publishedStatus: design.status,
        designLink: design.imageUrl,
        lastUpdated: design.updatedAt,
        creator: design.creator ? {
          id: design.creator.id,
          fullName: design.creator.fullName,
          profilePicture: design.creator.profilePicture,
        } : null,
      } as any;
    } catch (error) {
      this.logger.error(`Failed to fetch design: ${error.message}`, error.stack);
      throw new NotFoundException('Failed to fetch design');
    }
  }

  async getDesignById(designId: string): Promise<DesignRecord | null> {
    try {
      const design = await this.designRepository.findOne({
        where: { id: designId },
        select: [
          'id',
          'name',
          'creatorId',
          'imageUrl',
          'status',
          'mintedAt',
          'quantity',
          'price',
          'metadata',
          'description',
          'category'
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
