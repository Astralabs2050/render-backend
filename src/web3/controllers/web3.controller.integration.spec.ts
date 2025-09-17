import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Web3Controller } from './web3.controller';
import { NFTService } from '../services/nft.service';
import { TransactionHashValidatorService } from '../services/transaction-hash-validator.service';
import { ChatIdValidatorService } from '../services/chat-id-validator.service';
import { NFT } from '../entities/nft.entity';
import { Chat } from '../../ai-chat/entities/chat.entity';

describe('Web3Controller Integration - Mint Endpoint', () => {
  let app: INestApplication;
  let nftService: jest.Mocked<NFTService>;
  let chatIdValidator: jest.Mocked<ChatIdValidatorService>;
  let transactionHashValidator: jest.Mocked<TransactionHashValidatorService>;
  let jwtService: JwtService;

  const mockNFTService = {
    mintFromChatDesign: jest.fn(),
  };

  const mockChatIdValidator = {
    validateChatAccess: jest.fn(),
  };

  const mockTransactionHashValidator = {
    validateFormat: jest.fn(),
    createErrorResponse: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [Web3Controller],
      providers: [
        {
          provide: NFTService,
          useValue: mockNFTService,
        },
        {
          provide: ChatIdValidatorService,
          useValue: mockChatIdValidator,
        },
        {
          provide: TransactionHashValidatorService,
          useValue: mockTransactionHashValidator,
        },
        {
          provide: getRepositoryToken(NFT),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Chat),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-jwt-token'),
            verify: jest.fn(() => ({ id: 'user-123', userType: 'creator' })),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));

    nftService = moduleFixture.get(NFTService);
    chatIdValidator = moduleFixture.get(ChatIdValidatorService);
    transactionHashValidator = moduleFixture.get(TransactionHashValidatorService);
    jwtService = moduleFixture.get(JwtService);

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /web3/nft/mint', () => {
    const validMintRequest = {
      chatId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      selectedVariation: 'variation_1',
      paymentTransactionHash: '0x1234567890abcdef1234567890abcdef12345678',
    };

    const mockUser = { id: 'user-123', userType: 'creator' };
    const mockToken = 'Bearer mock-jwt-token';

    it('should successfully mint NFT with valid request', async () => {
      const mockNFT = {
        id: 'nft-123',
        tokenId: '1',
        name: 'Test NFT',
        status: 'minted',
      };

      nftService.mintFromChatDesign.mockResolvedValue(mockNFT as any);

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(validMintRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        status: true,
        message: 'Design minted successfully',
        data: mockNFT,
      });

      expect(nftService.mintFromChatDesign).toHaveBeenCalledWith(
        mockUser.id,
        validMintRequest.chatId,
        validMintRequest.selectedVariation,
        validMintRequest.paymentTransactionHash,
      );
    });

    it('should reject invalid UUID chatId with proper validation error', async () => {
      const invalidRequest = {
        ...validMintRequest,
        chatId: 'chat-456', // Invalid UUID format
      };

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([
          'chatId must be a valid UUID'
        ]),
      });

      expect(nftService.mintFromChatDesign).not.toHaveBeenCalled();
    });

    it('should reject empty selectedVariation', async () => {
      const invalidRequest = {
        ...validMintRequest,
        selectedVariation: '',
      };

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('selectedVariation is required');
      expect(nftService.mintFromChatDesign).not.toHaveBeenCalled();
    });

    it('should reject empty paymentTransactionHash', async () => {
      const invalidRequest = {
        ...validMintRequest,
        paymentTransactionHash: '',
      };

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.message).toContain('paymentTransactionHash is required');
      expect(nftService.mintFromChatDesign).not.toHaveBeenCalled();
    });

    it('should reject request with missing fields', async () => {
      const incompleteRequest = {
        chatId: validMintRequest.chatId,
        // Missing selectedVariation and paymentTransactionHash
      };

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'selectedVariation is required',
          'paymentTransactionHash is required',
        ])
      );

      expect(nftService.mintFromChatDesign).not.toHaveBeenCalled();
    });

    it('should handle transaction hash validation errors', async () => {
      const mockValidationResult = {
        isValid: false,
        errors: ['Invalid transaction hash format'],
      };

      const mockErrorResponse = {
        status: false,
        message: 'Invalid transaction hash format',
        path: '/web3/nft/mint',
      };

      nftService.mintFromChatDesign.mockRejectedValue(
        new Error('Transaction hash validation failed')
      );
      transactionHashValidator.validateFormat.mockReturnValue(mockValidationResult);
      transactionHashValidator.createErrorResponse.mockReturnValue(mockErrorResponse);

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(validMintRequest)
        .expect(400);

      expect(response.body).toMatchObject(mockErrorResponse);
    });

    it('should handle NFT service errors gracefully', async () => {
      nftService.mintFromChatDesign.mockRejectedValue(
        new Error('Chat not found')
      );

      const response = await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(validMintRequest)
        .expect(500);

      expect(response.body).toMatchObject({
        status: false,
        message: 'Internal server error',
        error: 'Chat not found',
        path: '/web3/nft/mint',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .send(validMintRequest)
        .expect(401);

      expect(nftService.mintFromChatDesign).not.toHaveBeenCalled();
    });

    it('should log request and response properly', async () => {
      const mockNFT = { id: 'nft-123', tokenId: '1' };
      nftService.mintFromChatDesign.mockResolvedValue(mockNFT as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app.getHttpServer())
        .post('/web3/nft/mint')
        .set('Authorization', mockToken)
        .send(validMintRequest)
        .expect(201);

      // Verify that logging occurred (request ID and completion logs)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('NFT minting request started'),
        expect.objectContaining({
          userId: mockUser.id,
          chatId: validMintRequest.chatId,
        })
      );

      consoleSpy.mockRestore();
    });
  });
});