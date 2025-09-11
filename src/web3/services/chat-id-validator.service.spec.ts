import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { ChatIdValidatorService } from './chat-id-validator.service';
import { Chat } from '../../ai-chat/entities/chat.entity';

describe('ChatIdValidatorService', () => {
  let service: ChatIdValidatorService;
  let chatRepository: jest.Mocked<Repository<Chat>>;

  const mockChatRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatIdValidatorService,
        {
          provide: getRepositoryToken(Chat),
          useValue: mockChatRepository,
        },
      ],
    }).compile();

    service = module.get<ChatIdValidatorService>(ChatIdValidatorService);
    chatRepository = module.get(getRepositoryToken(Chat));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateChatExists', () => {
    it('should return valid result when chat exists', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const mockChat = { id: chatId, title: 'Test Chat' };
      
      chatRepository.findOne.mockResolvedValue(mockChat as Chat);

      const result = await service.validateChatExists(chatId);

      expect(result.isValid).toBe(true);
      expect(result.chatId).toBe(chatId);
      expect(result.exists).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result when chat does not exist', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
      chatRepository.findOne.mockResolvedValue(null);

      const result = await service.validateChatExists(chatId);

      expect(result.isValid).toBe(false);
      expect(result.chatId).toBe(chatId);
      expect(result.exists).toBe(false);
      expect(result.errors).toContain('Chat not found');
    });

    it('should handle database errors gracefully', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const dbError = new Error('Database connection failed');
      
      chatRepository.findOne.mockRejectedValue(dbError);

      const result = await service.validateChatExists(chatId);

      expect(result.isValid).toBe(false);
      expect(result.chatId).toBe(chatId);
      expect(result.exists).toBe(false);
      expect(result.errors[0]).toContain('Database error: Database connection failed');
    });
  });

  describe('validateChatAccess', () => {
    it('should return valid result when user has access as creator', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const userId = 'user-123';
      const mockChat = { id: chatId, creatorId: userId };
      
      // First call for existence check
      chatRepository.findOne.mockResolvedValueOnce(mockChat as Chat);
      // Second call for access check
      chatRepository.findOne.mockResolvedValueOnce(mockChat as Chat);

      const result = await service.validateChatAccess(chatId, userId);

      expect(result.isValid).toBe(true);
      expect(result.chatId).toBe(chatId);
      expect(result.exists).toBe(true);
      expect(result.hasAccess).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid result when user has access as participant', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const userId = 'user-123';
      const mockChat = { id: chatId, userId: userId };
      
      // First call for existence check
      chatRepository.findOne.mockResolvedValueOnce(mockChat as Chat);
      // Second call for access check
      chatRepository.findOne.mockResolvedValueOnce(mockChat as Chat);

      const result = await service.validateChatAccess(chatId, userId);

      expect(result.isValid).toBe(true);
      expect(result.hasAccess).toBe(true);
    });

    it('should return invalid result when user has no access', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const userId = 'user-123';
      const mockChat = { id: chatId, creatorId: 'other-user' };
      
      // First call for existence check
      chatRepository.findOne.mockResolvedValueOnce(mockChat as Chat);
      // Second call for access check returns null (no access)
      chatRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.validateChatAccess(chatId, userId);

      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.hasAccess).toBe(false);
      expect(result.errors).toContain('Access denied to chat');
    });

    it('should return invalid result when chat does not exist', async () => {
      const chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const userId = 'user-123';
      
      // First call for existence check returns null
      chatRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.validateChatAccess(chatId, userId);

      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.errors).toContain('Chat not found');
    });
  });

  describe('createValidationError', () => {
    it('should create NOT_FOUND error when chat does not exist', () => {
      const result = {
        isValid: false,
        chatId: 'test-id',
        errors: ['Chat not found'],
        exists: false,
      };

      const exception = service.createValidationError(result);

      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const response = exception.getResponse() as any;
      expect(response.message).toBe('Chat not found');
      expect(response.status).toBe(false);
    });

    it('should create FORBIDDEN error when user has no access', () => {
      const result = {
        isValid: false,
        chatId: 'test-id',
        errors: ['Access denied to chat'],
        exists: true,
        hasAccess: false,
      };

      const exception = service.createValidationError(result);

      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      const response = exception.getResponse() as any;
      expect(response.message).toBe('Access denied to chat');
    });

    it('should create BAD_REQUEST error for generic validation failures', () => {
      const result = {
        isValid: false,
        chatId: 'test-id',
        errors: ['Generic validation error'],
        exists: true,
        hasAccess: true,
      };

      const exception = service.createValidationError(result);

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      const response = exception.getResponse() as any;
      expect(response.message).toBe('Chat validation failed');
    });

    it('should include proper error response structure', () => {
      const result = {
        isValid: false,
        chatId: 'test-id',
        errors: ['Test error'],
        exists: false,
      };

      const exception = service.createValidationError(result);
      const response = exception.getResponse() as any;

      expect(response).toHaveProperty('status', false);
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('errors');
      expect(response).toHaveProperty('path', '/web3/nft/mint');
      expect(response).toHaveProperty('timestamp');
      expect(response.errors).toContain('Test error');
    });
  });
});