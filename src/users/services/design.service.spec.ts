import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DesignService } from './design.service';
import { NFT, NFTStatus } from '../../web3/entities/nft.entity';
import { CreateDesignInventoryDto } from '../dto/create-design-inventory.dto';

describe('DesignService', () => {
  let service: DesignService;
  let repository: Repository<NFT>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignService,
        {
          provide: getRepositoryToken(NFT),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DesignService>(DesignService);
    repository = module.get<Repository<NFT>>(getRepositoryToken(NFT));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventoryById', () => {
    const mockDesignId = '550e8400-e29b-41d4-a716-446655440000';
    const mockCreatorId = '550e8400-e29b-41d4-a716-446655440001';
    const mockDesign = {
      id: mockDesignId,
      name: 'Test Design',
      price: 100,
      quantity: 5,
      status: NFTStatus.LISTED,
      imageUrl: 'https://example.com/image.jpg',
      updatedAt: new Date('2023-01-01'),
    };

    it('should return design inventory item when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockDesign);

      const result = await service.getInventoryById(mockDesignId, mockCreatorId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockDesignId,
          creatorId: mockCreatorId,
        },
        select: [
          'id',
          'name',
          'price',
          'quantity',
          'status',
          'imageUrl',
          'updatedAt',
        ],
      });

      expect(result).toEqual({
        id: mockDesign.id,
        name: mockDesign.name,
        price: mockDesign.price,
        quantity: mockDesign.quantity,
        publishedStatus: mockDesign.status,
        designLink: mockDesign.imageUrl,
        lastUpdated: mockDesign.updatedAt,
      });
    });

    it('should return null when design not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getInventoryById(mockDesignId, mockCreatorId);

      expect(result).toBeNull();
    });

    it('should handle null price and quantity values', async () => {
      const designWithNulls = {
        ...mockDesign,
        price: null,
        quantity: null,
      };
      mockRepository.findOne.mockResolvedValue(designWithNulls);

      const result = await service.getInventoryById(mockDesignId, mockCreatorId);

      expect(result).toEqual({
        id: mockDesign.id,
        name: mockDesign.name,
        price: 0,
        quantity: 0,
        publishedStatus: mockDesign.status,
        designLink: mockDesign.imageUrl,
        lastUpdated: mockDesign.updatedAt,
      });
    });

    it('should throw NotFoundException when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(
        service.getInventoryById(mockDesignId, mockCreatorId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getInventoryById(mockDesignId, mockCreatorId)
      ).rejects.toThrow('Failed to fetch inventory item');
    });

    it('should handle undefined price and quantity values', async () => {
      const designWithUndefined = {
        ...mockDesign,
        price: undefined,
        quantity: undefined,
      };
      mockRepository.findOne.mockResolvedValue(designWithUndefined);

      const result = await service.getInventoryById(mockDesignId, mockCreatorId);

      expect(result).toEqual({
        id: mockDesign.id,
        name: mockDesign.name,
        price: 0,
        quantity: 0,
        publishedStatus: mockDesign.status,
        designLink: mockDesign.imageUrl,
        lastUpdated: mockDesign.updatedAt,
      });
    });
  });

  describe('getCreatorInventory', () => {
    const mockCreatorId = '550e8400-e29b-41d4-a716-446655440001';
    const mockDesigns = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Design 1',
        price: 100,
        quantity: 5,
        status: NFTStatus.LISTED,
        imageUrl: 'https://example.com/image1.jpg',
        updatedAt: new Date('2023-01-01'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Design 2',
        price: 200,
        quantity: 3,
        status: NFTStatus.MINTED,
        imageUrl: 'https://example.com/image2.jpg',
        updatedAt: new Date('2023-01-02'),
      },
    ];

    it('should return creator inventory successfully', async () => {
      mockRepository.find.mockResolvedValue(mockDesigns);

      const result = await service.getCreatorInventory(mockCreatorId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockDesigns[0].id,
        name: mockDesigns[0].name,
        price: mockDesigns[0].price,
        quantity: mockDesigns[0].quantity,
        publishedStatus: mockDesigns[0].status,
        designLink: mockDesigns[0].imageUrl,
        lastUpdated: mockDesigns[0].updatedAt,
      });
    });

    it('should return empty array when no designs found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getCreatorInventory(mockCreatorId);

      expect(result).toEqual([]);
    });
  });
});