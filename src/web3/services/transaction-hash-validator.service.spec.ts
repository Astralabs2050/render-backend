import { Test, TestingModule } from '@nestjs/testing';
import { TransactionHashValidatorService, ValidationErrorCode } from './transaction-hash-validator.service';

describe('TransactionHashValidatorService', () => {
  let service: TransactionHashValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionHashValidatorService],
    }).compile();

    service = module.get<TransactionHashValidatorService>(TransactionHashValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFormat', () => {
    it('should validate a correct Ethereum transaction hash', () => {
      const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = service.validateFormat(validHash);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedHash).toBe(validHash.toLowerCase());
    });

    it('should validate a correct Polygon transaction hash', () => {
      const validHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = service.validateFormat(validHash, '137');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedHash).toBe(validHash.toLowerCase());
    });

    it('should validate a system-generated transaction hash (42 characters)', () => {
      const systemHash = '0x1234567890abcdef1234567890abcdef12345678';
      const result = service.validateFormat(systemHash);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedHash).toBe(systemHash.toLowerCase());
    });

    it('should reject empty hash', () => {
      const result = service.validateFormat('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash cannot be empty');
      expect(result.normalizedHash).toBeUndefined();
    });

    it('should reject null hash', () => {
      const result = service.validateFormat(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash cannot be empty');
    });

    it('should reject undefined hash', () => {
      const result = service.validateFormat(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash cannot be empty');
    });

    it('should reject hash without 0x prefix', () => {
      const invalidHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = service.validateFormat(invalidHash);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash must start with "0x"');
    });

    it('should reject hash with incorrect length (too short)', () => {
      const invalidHash = '0x123456';
      const result = service.validateFormat(invalidHash);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash must be either 66 characters (full format) or 42 characters (system format), got 8');
    });

    it('should reject hash with incorrect length (too long)', () => {
      const invalidHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
      const result = service.validateFormat(invalidHash);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash must be either 66 characters (full format) or 42 characters (system format), got 68');
    });

    it('should reject hash with invalid characters', () => {
      const invalidHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdeg';
      const result = service.validateFormat(invalidHash);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transaction hash contains invalid characters. Only hexadecimal characters (0-9, a-f, A-F) are allowed');
    });

    it('should handle mixed case hash correctly', () => {
      const mixedCaseHash = '0x1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf';
      const result = service.validateFormat(mixedCaseHash);

      expect(result.isValid).toBe(true);
      expect(result.normalizedHash).toBe(mixedCaseHash.toLowerCase());
    });

    it('should trim whitespace from hash', () => {
      const hashWithWhitespace = '  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  ';
      const result = service.validateFormat(hashWithWhitespace);

      expect(result.isValid).toBe(true);
      expect(result.normalizedHash).toBe(hashWithWhitespace.trim().toLowerCase());
    });
  });

  describe('validateWithDetails', () => {
    it('should provide detailed error information', () => {
      const invalidHash = 'invalid';
      const result = service.validateWithDetails(invalidHash);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_PREFIX);
      expect(result.errors[1].code).toBe(ValidationErrorCode.INVALID_LENGTH);
      expect(result.errors[2].code).toBe(ValidationErrorCode.INVALID_CHARACTERS);
    });

    it('should return no errors for valid hash', () => {
      const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = service.validateWithDetails(validHash);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedHash).toBe(validHash.toLowerCase());
    });
  });

  describe('isValidHash', () => {
    it('should return true for valid hash', () => {
      const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(service.isValidHash(validHash)).toBe(true);
    });

    it('should return false for invalid hash', () => {
      const invalidHash = 'invalid';
      expect(service.isValidHash(invalidHash)).toBe(false);
    });
  });

  describe('normalizeHash', () => {
    it('should normalize valid hash to lowercase', () => {
      const mixedCaseHash = '0x1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf';
      const normalized = service.normalizeHash(mixedCaseHash);

      expect(normalized).toBe(mixedCaseHash.toLowerCase());
    });

    it('should return null for invalid hash', () => {
      const invalidHash = 'invalid';
      const normalized = service.normalizeHash(invalidHash);

      expect(normalized).toBeNull();
    });
  });

  describe('getUserFriendlyError', () => {
    it('should return empty string for valid result', () => {
      const validResult = { isValid: true, errors: [] };
      const message = service.getUserFriendlyError(validResult);

      expect(message).toBe('');
    });

    it('should return user-friendly message for empty hash', () => {
      const invalidResult = { isValid: false, errors: ['Transaction hash cannot be empty'] };
      const message = service.getUserFriendlyError(invalidResult);

      expect(message).toBe('Please provide a transaction hash for payment verification.');
    });

    it('should return user-friendly message for invalid prefix', () => {
      const invalidResult = { isValid: false, errors: ['Transaction hash must start with "0x"'] };
      const message = service.getUserFriendlyError(invalidResult);

      expect(message).toBe('Transaction hash must start with "0x". Please check your transaction hash format.');
    });

    it('should return user-friendly message for invalid length', () => {
      const invalidResult = { isValid: false, errors: ['Transaction hash must be either 66 characters (full format) or 42 characters (system format), got 8'] };
      const message = service.getUserFriendlyError(invalidResult);

      expect(message).toBe('Transaction hash must be either 66 characters (full blockchain format) or 42 characters (system format). Please verify your transaction hash.');
    });

    it('should return user-friendly message for invalid characters', () => {
      const invalidResult = { isValid: false, errors: ['Transaction hash contains invalid characters. Only hexadecimal characters (0-9, a-f, A-F) are allowed'] };
      const message = service.getUserFriendlyError(invalidResult);

      expect(message).toBe('Transaction hash contains invalid characters. Please ensure it only contains numbers (0-9) and letters (a-f, A-F).');
    });

    it('should return generic message for unknown error', () => {
      const invalidResult = { isValid: false, errors: ['Unknown error'] };
      const message = service.getUserFriendlyError(invalidResult);

      expect(message).toBe('Invalid transaction hash format. Please provide a valid blockchain transaction hash.');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported blockchain formats', () => {
      const formats = service.getSupportedFormats();

      expect(formats).toHaveLength(5);
      expect(formats.map(f => f.name)).toContain('Ethereum');
      expect(formats.map(f => f.name)).toContain('Polygon');
      expect(formats.map(f => f.name)).toContain('Binance Smart Chain');
      expect(formats.map(f => f.name)).toContain('Arbitrum');
      expect(formats.map(f => f.name)).toContain('System Generated');
    });
  });

  describe('getFormatByChainId', () => {
    it('should return Ethereum format for chain ID 1', () => {
      const format = service.getFormatByChainId('1');

      expect(format).toBeDefined();
      expect(format!.name).toBe('Ethereum');
      expect(format!.chainId).toBe('1');
    });

    it('should return Polygon format for chain ID 137', () => {
      const format = service.getFormatByChainId('137');

      expect(format).toBeDefined();
      expect(format!.name).toBe('Polygon');
      expect(format!.chainId).toBe('137');
    });

    it('should return undefined for unsupported chain ID', () => {
      const format = service.getFormatByChainId('999');

      expect(format).toBeUndefined();
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple hashes', () => {
      const hashes = [
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        'invalid',
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      ];
      const results = service.validateMultiple(hashes);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });
  });

  describe('detectHashFormat', () => {
    it('should detect full format hash', () => {
      const fullHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(service.detectHashFormat(fullHash)).toBe('full');
    });

    it('should detect system format hash', () => {
      const systemHash = '0x1234567890abcdef1234567890abcdef12345678';
      expect(service.detectHashFormat(systemHash)).toBe('system');
    });

    it('should detect invalid format', () => {
      expect(service.detectHashFormat('invalid')).toBe('invalid');
      expect(service.detectHashFormat('0x123')).toBe('invalid');
      expect(service.detectHashFormat('')).toBe('invalid');
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const validationResult = {
        isValid: false,
        errors: ['Transaction hash must start with "0x"'],
      };
      const errorResponse = service.createErrorResponse(validationResult);

      expect(errorResponse.status).toBe(false);
      expect(errorResponse.message).toBe('Transaction hash validation failed');
      expect(errorResponse.error).toBe('Transaction hash must start with "0x"');
      expect(errorResponse.details.field).toBe('paymentTransactionHash');
      expect(errorResponse.details.code).toBe(ValidationErrorCode.INVALID_PREFIX);
      expect(errorResponse.timestamp).toBeDefined();
    });
  });
});