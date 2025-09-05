import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NFT, NFTStatus } from '../../web3/entities/nft.entity';
import { MarketplaceFilterDto, SortBy } from '../dto/marketplace-filter.dto';
import { FashionCategory, CategoryService } from '../../common/enums/category.enum';

export interface MarketplaceNFT {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  imageUrl: string;
  status: NFTStatus;
  createdAt: Date;
  creator: {
    id: string;
    fullName: string;
    profilePicture?: string;
  };
  metadata?: {
    deliveryWindow?: string;
    brandStory?: string;
    regionOfDelivery?: string;
  };
}

export interface MarketplaceResponse {
  items: MarketplaceNFT[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    categories: FashionCategory[];
    priceRange: { min: number; max: number };
    regions: string[];
  };
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
  ) {}

  async browseMarketplace(filters: MarketplaceFilterDto): Promise<MarketplaceResponse> {
    try {
      const queryBuilder = this.createBaseQuery();
      
      // Apply filters
      this.applyFilters(queryBuilder, filters);
      
      // Apply sorting
      this.applySorting(queryBuilder, filters.sortBy);
      
      // Get total count before pagination
      const total = await queryBuilder.getCount();
      
      // Apply pagination
      queryBuilder
        .limit(filters.limit || 20)
        .offset(filters.offset || 0);
      
      const nfts = await queryBuilder.getMany();
      
      // Get filter options for frontend
      const filterOptions = await this.getFilterOptions();
      
      const items: MarketplaceNFT[] = nfts.map(nft => ({
        id: nft.id,
        name: nft.name,
        description: nft.description,
        category: nft.category,
        price: nft.price,
        quantity: nft.quantity,
        imageUrl: nft.imageUrl,
        status: nft.status,
        createdAt: nft.createdAt,
        creator: {
          id: nft.creator.id,
          fullName: nft.creator.fullName,
          profilePicture: nft.creator.profilePicture,
        },
        metadata: nft.metadata,
      }));

      const page = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
      const totalPages = Math.ceil(total / (filters.limit || 20));

      this.logger.log(`Marketplace browse: ${items.length} items returned, ${total} total`);

      return {
        items,
        total,
        page,
        limit: filters.limit || 20,
        totalPages,
        filters: filterOptions,
      };
    } catch (error) {
      this.logger.error(`Failed to browse marketplace: ${error.message}`);
      throw error;
    }
  }

  async getMarketplaceItem(id: string): Promise<MarketplaceNFT | null> {
    try {
      const nft = await this.nftRepository
        .createQueryBuilder('nft')
        .leftJoinAndSelect('nft.creator', 'creator')
        .where('nft.id = :id', { id })
        .andWhere('nft.status = :status', { status: NFTStatus.LISTED })
        .select([
          'nft.id',
          'nft.name',
          'nft.description',
          'nft.category',
          'nft.price',
          'nft.quantity',
          'nft.imageUrl',
          'nft.status',
          'nft.createdAt',
          'nft.metadata',
          'creator.id',
          'creator.fullName',
          'creator.profilePicture',
        ])
        .getOne();

      if (!nft) {
        return null;
      }

      return {
        id: nft.id,
        name: nft.name,
        description: nft.description,
        category: nft.category,
        price: nft.price,
        quantity: nft.quantity,
        imageUrl: nft.imageUrl,
        status: nft.status,
        createdAt: nft.createdAt,
        creator: {
          id: nft.creator.id,
          fullName: nft.creator.fullName,
          profilePicture: nft.creator.profilePicture,
        },
        metadata: nft.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get marketplace item: ${error.message}`);
      throw error;
    }
  }

  private createBaseQuery(): SelectQueryBuilder<NFT> {
    return this.nftRepository
      .createQueryBuilder('nft')
      .leftJoinAndSelect('nft.creator', 'creator')
      .where('nft.status = :status', { status: NFTStatus.LISTED })
      .andWhere('nft.quantity > 0') // Only show items with available quantity
      .select([
        'nft.id',
        'nft.name',
        'nft.description',
        'nft.category',
        'nft.price',
        'nft.quantity',
        'nft.imageUrl',
        'nft.status',
        'nft.createdAt',
        'nft.metadata',
        'creator.id',
        'creator.fullName',
        'creator.profilePicture',
      ]);
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<NFT>, filters: MarketplaceFilterDto): void {
    // Search by name or description
    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(nft.name) LIKE LOWER(:search) OR LOWER(nft.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    // Filter by category
    if (filters.category) {
      queryBuilder.andWhere('nft.category = :category', { 
        category: filters.category 
      });
    }

    // Price range filter
    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('nft.price >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('nft.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    // Filter by creators
    if (filters.creators && filters.creators.length > 0) {
      queryBuilder.andWhere('nft.creatorId IN (:...creators)', { creators: filters.creators });
    }

    // Filter by delivery region
    if (filters.region) {
      queryBuilder.andWhere(
        "nft.metadata->>'regionOfDelivery' ILIKE :region",
        { region: `%${filters.region}%` }
      );
    }
  }

  private applySorting(queryBuilder: SelectQueryBuilder<NFT>, sortBy?: SortBy): void {
    switch (sortBy) {
      case SortBy.PRICE_LOW_TO_HIGH:
        queryBuilder.orderBy('nft.price', 'ASC');
        break;
      case SortBy.PRICE_HIGH_TO_LOW:
        queryBuilder.orderBy('nft.price', 'DESC');
        break;
      case SortBy.NEWEST:
        queryBuilder.orderBy('nft.createdAt', 'DESC');
        break;
      case SortBy.OLDEST:
        queryBuilder.orderBy('nft.createdAt', 'ASC');
        break;
      case SortBy.NAME_A_TO_Z:
        queryBuilder.orderBy('nft.name', 'ASC');
        break;
      case SortBy.NAME_Z_TO_A:
        queryBuilder.orderBy('nft.name', 'DESC');
        break;
      default:
        queryBuilder.orderBy('nft.createdAt', 'DESC'); // Default to newest first
    }
  }

  private async getFilterOptions() {
    // Get available categories from database
    const dbCategories = await this.nftRepository
      .createQueryBuilder('nft')
      .select('DISTINCT nft.category', 'category')
      .where('nft.status = :status', { status: NFTStatus.LISTED })
      .getRawMany();

    // Normalize categories and include all standard categories
    const availableCategories = new Set<FashionCategory>();
    
    // Add categories from database (normalized)
    dbCategories.forEach(c => {
      if (c.category) {
        const normalizedCategory = CategoryService.normalizeCategory(c.category);
        availableCategories.add(normalizedCategory);
      }
    });
    
    // Always include all standard categories for consistent UI
    CategoryService.getAllCategories().forEach(cat => availableCategories.add(cat));

    // Get price range
    const priceRange = await this.nftRepository
      .createQueryBuilder('nft')
      .select('MIN(nft.price)', 'min')
      .addSelect('MAX(nft.price)', 'max')
      .where('nft.status = :status', { status: NFTStatus.LISTED })
      .getRawOne();

    // Get available regions
    const regions = await this.nftRepository
      .createQueryBuilder('nft')
      .select("DISTINCT nft.metadata->>'regionOfDelivery'", 'region')
      .where('nft.status = :status', { status: NFTStatus.LISTED })
      .andWhere("nft.metadata->>'regionOfDelivery' IS NOT NULL")
      .getRawMany();

    return {
      categories: Array.from(availableCategories),
      priceRange: {
        min: parseFloat(priceRange?.min || '0'),
        max: parseFloat(priceRange?.max || '0'),
      },
      regions: regions.map(r => r.region).filter(Boolean),
    };
  }
}