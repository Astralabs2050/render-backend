import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreatorController } from './creator.controller';
import { DesignService } from '../services/design.service';
import { JobService } from '../../marketplace/services/job.service';
import { NFTStatus } from '../../web3/entities/nft.entity';
import { CreateDesignInventoryDto } from '../dto/create-design-inventory.dto';

describe('CreatorController', () => {
  let controller: CreatorController;
  let designService: DesignService;
  let jobService: JobService;

  const mockDesignService = {
    getCreatorInventory: jest.fn(),
    getInventoryById: jest.fn(),
    getDesignById: jest.fn(),
  };

  const mockJobService = {
    createJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorController],
      providers: [
        {
          provide: DesignService,
          useValue: mockDesignService,
        },
        {
          provide: JobService,
          useValue: mockJobService,
        },
      ],
    }).compile();

    controller = module.get<CreatorController>(CreatorController);
    designService = module.get<DesignService>(DesignService);
    jobService = module.get<JobService>(JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventoryById', () => {
    const mockDesignId = '550e8400-e29b-41d4-a716-446655440000';
    const mockCreatorId = '550e8400-e29b-41d4-a716-446655440001';
    const mockRequest = {
      user: {
        id: mockCreatorId,
      },
    };

    const mockDesignInventory: CreateDesignInventoryDto = {
      id: mockDesignId,
      name: 'Test Design',
      price: 100,
      quantity: 5,
      publishedStatus: NFTStatus.LISTED,
      designLink: 'https://example.com/image.jpg',
      lastUpdated: new Date('2023-01-01'),
    };

    it('should return design successfully when found and owned by creator', async () => {
      mockDesignService.getInventoryById.mockResolvedValue(mockDesignInventory);

      const result = await controller.getInventoryById(mockDesignId, mockRequest);

      expect(mockDesignService.getInventoryById).toHaveBeenCalledWith(
        mockDesignId,
        mockCreatorId
      );
      expect(result).toEqual({
        status: true,
        message: 'Design retrieved successfully',
        data: mockDesignInventory,
      });
    });

    it('should throw NotFoundException when design not found', async () => {
      mockDesignService.getInventoryById.mockResolvedValue(null);

      await expect(
        controller.getInventoryById(mockDesignId, mockRequest)
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getInventoryById(mockDesignId, mockRequest)
      ).rejects.toThrow('Design not found');
    });

    it('should throw NotFoundException when design does not belong to creator', async () => {
      mockDesignService.getInventoryById.mockResolvedValue(null);

      await expect(
        controller.getInventoryById(mockDesignId, mockRequest)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle service errors properly', async () => {
      const serviceError = new NotFoundException('Failed to fetch inventory item');
      mockDesignService.getInventoryById.mockRejectedValue(serviceError);

      await expect(
        controller.getInventoryById(mockDesignId, mockRequest)
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.getInventoryById(mockDesignId, mockRequest)
      ).rejects.toThrow('Failed to fetch inventory item');
    });

    it('should call service with correct parameters', async () => {
      mockDesignService.getInventoryById.mockResolvedValue(mockDesignInventory);

      await controller.getInventoryById(mockDesignId, mockRequest);

      expect(mockDesignService.getInventoryById).toHaveBeenCalledTimes(1);
      expect(mockDesignService.getInventoryById).toHaveBeenCalledWith(
        mockDesignId,
        mockCreatorId
      );
    });

    it('should return consistent response format', async () => {
      mockDesignService.getInventoryById.mockResolvedValue(mockDesignInventory);

      const result = await controller.getInventoryById(mockDesignId, mockRequest);

      expect(result).toHaveProperty('status', true);
      expect(result).toHaveProperty('message', 'Design retrieved successfully');
      expect(result).toHaveProperty('data', mockDesignInventory);
    });
  });

  describe('getCreatorInventory', () => {
    const mockCreatorId = '550e8400-e29b-41d4-a716-446655440001';
    const mockRequest = {
      user: {
        id: mockCreatorId,
      },
    };

    const mockInventoryList: CreateDesignInventoryDto[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Design 1',
        price: 100,
        quantity: 5,
        publishedStatus: NFTStatus.LISTED,
        designLink: 'https://example.com/image1.jpg',
        lastUpdated: new Date('2023-01-01'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Design 2',
        price: 200,
        quantity: 3,
        publishedStatus: NFTStatus.MINTED,
        designLink: 'https://example.com/image2.jpg',
        lastUpdated: new Date('2023-01-02'),
      },
    ];

    it('should return creator inventory successfully', async () => {
      mockDesignService.getCreatorInventory.mockResolvedValue(mockInventoryList);

      const result = await controller.getCreatorInventory(mockRequest);

      expect(mockDesignService.getCreatorInventory).toHaveBeenCalledWith(mockCreatorId);
      expect(result).toEqual({
        status: true,
        message: 'Creator inventory retrieved successfully',
        data: mockInventoryList,
      });
    });

    it('should return empty inventory when no designs found', async () => {
      mockDesignService.getCreatorInventory.mockResolvedValue([]);

      const result = await controller.getCreatorInventory(mockRequest);

      expect(result).toEqual({
        status: true,
        message: 'Creator inventory retrieved successfully',
        data: [],
      });
    });
  });
});