import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { CreatorController } from './creator.controller';
import { DesignService } from '../services/design.service';
import { JobService } from '../../marketplace/services/job.service';
import { NFT, NFTStatus } from '../../web3/entities/nft.entity';
import { User, UserType } from '../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';

describe('CreatorController (Integration)', () => {
  let app: INestApplication;
  let nftRepository: Repository<NFT>;
  let userRepository: Repository<User>;
  let creatorUser: User;
  let testDesign: NFT;

  // Mock guards for testing
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRoleGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockJobService = {
    createJob: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [NFT, User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([NFT, User]),
      ],
      controllers: [CreatorController],
      providers: [
        DesignService,
        {
          provide: JobService,
          useValue: mockJobService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    nftRepository = moduleFixture.get('NFTRepository');
    userRepository = moduleFixture.get('UserRepository');
  });

  beforeEach(async () => {
    // Clean up database
    await nftRepository.clear();
    await userRepository.clear();

    // Create test creator user
    creatorUser = await userRepository.save({
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'creator@test.com',
      username: 'testcreator',
      userType: UserType.CREATOR,
    });

    // Create test design
    testDesign = await nftRepository.save({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Design',
      description: 'A test design',
      category: 'clothing',
      price: 100,
      quantity: 5,
      status: NFTStatus.LISTED,
      imageUrl: 'https://example.com/image.jpg',
      creatorId: creatorUser.id,
    });

    // Mock request user
    jest.spyOn(mockJwtAuthGuard, 'canActivate').mockImplementation((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = { id: creatorUser.id };
      return true;
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /creator/inventory/:id', () => {
    it('should return design when valid ID and ownership', async () => {
      const response = await request(app.getHttpServer())
        .get(`/creator/inventory/${testDesign.id}`)
        .expect(200);

      expect(response.body).toEqual({
        status: true,
        message: 'Design retrieved successfully',
        data: {
          id: testDesign.id,
          name: testDesign.name,
          price: testDesign.price,
          quantity: testDesign.quantity,
          publishedStatus: testDesign.status,
          designLink: testDesign.imageUrl,
          lastUpdated: expect.any(String),
        },
      });
    });

    it('should return 404 when design not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      
      const response = await request(app.getHttpServer())
        .get(`/creator/inventory/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toBe('Design not found');
    });

    it('should return 404 when design belongs to different creator', async () => {
      // Create another creator and design
      const otherCreator = await userRepository.save({
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'other@test.com',
        username: 'othercreator',
        userType: UserType.CREATOR,
      });

      const otherDesign = await nftRepository.save({
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Other Design',
        description: 'Another test design',
        category: 'clothing',
        price: 200,
        quantity: 3,
        status: NFTStatus.LISTED,
        imageUrl: 'https://example.com/other.jpg',
        creatorId: otherCreator.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/creator/inventory/${otherDesign.id}`)
        .expect(404);

      expect(response.body.message).toBe('Design not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';
      
      await request(app.getHttpServer())
        .get(`/creator/inventory/${invalidId}`)
        .expect(400);
    });

    it('should handle designs with null price and quantity', async () => {
      // Create design with null values
      const designWithNulls = await nftRepository.save({
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Design with Nulls',
        description: 'Test design with null values',
        category: 'clothing',
        price: null,
        quantity: null,
        status: NFTStatus.DRAFT,
        imageUrl: 'https://example.com/null.jpg',
        creatorId: creatorUser.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/creator/inventory/${designWithNulls.id}`)
        .expect(200);

      expect(response.body.data.price).toBe(0);
      expect(response.body.data.quantity).toBe(0);
    });

    it('should return consistent response format', async () => {
      const response = await request(app.getHttpServer())
        .get(`/creator/inventory/${testDesign.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.status).toBe('boolean');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.data).toBe('object');
    });
  });

  describe('GET /creator/inventory', () => {
    it('should return all creator inventory', async () => {
      // Create additional design
      await nftRepository.save({
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Second Design',
        description: 'Another test design',
        category: 'accessories',
        price: 150,
        quantity: 2,
        status: NFTStatus.MINTED,
        imageUrl: 'https://example.com/second.jpg',
        creatorId: creatorUser.id,
      });

      const response = await request(app.getHttpServer())
        .get('/creator/inventory')
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.message).toBe('Creator inventory retrieved successfully');
      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array when no designs exist', async () => {
      await nftRepository.clear();

      const response = await request(app.getHttpServer())
        .get('/creator/inventory')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      jest.spyOn(mockJwtAuthGuard, 'canActivate').mockReturnValue(false);

      await request(app.getHttpServer())
        .get(`/creator/inventory/${testDesign.id}`)
        .expect(403);
    });

    it('should require creator role', async () => {
      jest.spyOn(mockRoleGuard, 'canActivate').mockReturnValue(false);

      await request(app.getHttpServer())
        .get(`/creator/inventory/${testDesign.id}`)
        .expect(403);
    });
  });
});