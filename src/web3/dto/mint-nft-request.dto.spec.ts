import { validate } from 'class-validator';
import { MintNFTRequestDto } from './mint-nft-request.dto';

describe('MintNFTRequestDto', () => {
  let dto: MintNFTRequestDto;

  beforeEach(() => {
    dto = new MintNFTRequestDto();
  });

  describe('chatId validation', () => {
    it('should accept valid UUID chatId', async () => {
      dto.chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const chatIdErrors = errors.filter(error => error.property === 'chatId');
      
      expect(chatIdErrors).toHaveLength(0);
    });

    it('should reject invalid UUID format', async () => {
      dto.chatId = 'chat-456';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const chatIdErrors = errors.filter(error => error.property === 'chatId');
      
      expect(chatIdErrors).toHaveLength(1);
      expect(chatIdErrors[0].constraints?.isUuid).toBe('chatId must be a valid UUID');
    });

    it('should reject empty chatId', async () => {
      dto.chatId = '';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const chatIdErrors = errors.filter(error => error.property === 'chatId');
      
      expect(chatIdErrors).toHaveLength(1);
      expect(chatIdErrors[0].constraints?.isUuid).toBe('chatId must be a valid UUID');
    });

    it('should reject non-string chatId', async () => {
      (dto as any).chatId = 123;
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const chatIdErrors = errors.filter(error => error.property === 'chatId');
      
      expect(chatIdErrors).toHaveLength(1);
    });
  });

  describe('selectedVariation validation', () => {
    it('should accept valid selectedVariation', async () => {
      dto.chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const variationErrors = errors.filter(error => error.property === 'selectedVariation');
      
      expect(variationErrors).toHaveLength(0);
    });

    it('should reject empty selectedVariation', async () => {
      dto.chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      dto.selectedVariation = '';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const variationErrors = errors.filter(error => error.property === 'selectedVariation');
      
      expect(variationErrors).toHaveLength(1);
      expect(variationErrors[0].constraints?.isNotEmpty).toBe('selectedVariation is required');
    });
  });

  describe('paymentTransactionHash validation', () => {
    it('should accept valid paymentTransactionHash', async () => {
      dto.chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      const hashErrors = errors.filter(error => error.property === 'paymentTransactionHash');
      
      expect(hashErrors).toHaveLength(0);
    });

    it('should reject empty paymentTransactionHash', async () => {
      dto.chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '';

      const errors = await validate(dto);
      const hashErrors = errors.filter(error => error.property === 'paymentTransactionHash');
      
      expect(hashErrors).toHaveLength(1);
      expect(hashErrors[0].constraints?.isNotEmpty).toBe('paymentTransactionHash is required');
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      dto.chatId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      dto.selectedVariation = 'variation_1';
      dto.paymentTransactionHash = '0x1234567890abcdef';

      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should provide clear error messages for invalid inputs', async () => {
      dto.chatId = 'invalid-uuid';
      dto.selectedVariation = '';
      dto.paymentTransactionHash = '';

      const errors = await validate(dto);
      
      expect(errors).toHaveLength(3);
      
      const errorMessages = errors.reduce((acc, error) => {
        acc[error.property] = Object.values(error.constraints || {});
        return acc;
      }, {} as Record<string, string[]>);

      expect(errorMessages.chatId).toContain('chatId must be a valid UUID');
      expect(errorMessages.selectedVariation).toContain('selectedVariation is required');
      expect(errorMessages.paymentTransactionHash).toContain('paymentTransactionHash is required');
    });
  });
});