import { Injectable, Logger } from '@nestjs/common';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedHash?: string;
}

export interface ChainValidationResult extends ValidationResult {
  transaction?: {
    hash: string;
    status: 'success' | 'failed' | 'pending';
    value: string;
    from: string;
    to: string;
    blockNumber: number;
    confirmations: number;
  };
}

export interface BlockchainFormat {
  name: string;
  chainId: string;
  hashLength: number;
  prefix: string;
  pattern: RegExp;
}

export enum ValidationErrorCode {
  FORMAT_INVALID = 'FORMAT_INVALID',
  EMPTY_HASH = 'EMPTY_HASH',
  INVALID_PREFIX = 'INVALID_PREFIX',
  INVALID_LENGTH = 'INVALID_LENGTH',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  CHAIN_NOT_FOUND = 'CHAIN_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
}

@Injectable()
export class TransactionHashValidatorService {
  private readonly logger = new Logger(TransactionHashValidatorService.name);

  private readonly supportedFormats: BlockchainFormat[] = [
    {
      name: 'Ethereum',
      chainId: '1',
      hashLength: 66,
      prefix: '0x',
      pattern: /^0x[a-fA-F0-9]{64}$/,
    },
    {
      name: 'Polygon',
      chainId: '137',
      hashLength: 66,
      prefix: '0x',
      pattern: /^0x[a-fA-F0-9]{64}$/,
    },
    {
      name: 'Binance Smart Chain',
      chainId: '56',
      hashLength: 66,
      prefix: '0x',
      pattern: /^0x[a-fA-F0-9]{64}$/,
    },
    {
      name: 'Arbitrum',
      chainId: '42161',
      hashLength: 66,
      prefix: '0x',
      pattern: /^0x[a-fA-F0-9]{64}$/,
    },
    {
      name: 'System Generated',
      chainId: 'system',
      hashLength: 42,
      prefix: '0x',
      pattern: /^0x[a-fA-F0-9]{40}$/,
    },
  ];

  /**
   * Validates the format of a transaction hash
   */
  validateFormat(hash: string, chainId?: string): ValidationResult {
    const errors: string[] = [];

    // Check for empty, null, or undefined
    if (!hash || hash.trim() === '') {
      errors.push('Transaction hash cannot be empty');
      return {
        isValid: false,
        errors,
      };
    }

    const trimmedHash = hash.trim();

    // Check prefix
    if (!trimmedHash.startsWith('0x')) {
      errors.push('Transaction hash must start with "0x"');
    }

    // Check length - accept both 66 (full) and 42 (system generated) character formats
    if (trimmedHash.length !== 66 && trimmedHash.length !== 42) {
      errors.push(`Transaction hash must be either 66 characters (full format) or 42 characters (system format), got ${trimmedHash.length}`);
    }

    // Check for valid hexadecimal characters - support both formats
    const fullHashPattern = /^0x[a-fA-F0-9]{64}$/;
    const systemHashPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!fullHashPattern.test(trimmedHash) && !systemHashPattern.test(trimmedHash)) {
      errors.push('Transaction hash contains invalid characters. Only hexadecimal characters (0-9, a-f, A-F) are allowed');
    }

    // If chainId is provided, validate against specific chain format
    if (chainId) {
      const chainFormat = this.supportedFormats.find(format => format.chainId === chainId);
      if (chainFormat && !chainFormat.pattern.test(trimmedHash)) {
        errors.push(`Transaction hash format is invalid for ${chainFormat.name} (Chain ID: ${chainId})`);
      }
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.logger.log(`Transaction hash validation successful: ${trimmedHash.substring(0, 10)}...`);
    } else {
      this.logger.warn(`Transaction hash validation failed: ${errors.join(', ')}`);
    }

    return {
      isValid,
      errors,
      normalizedHash: isValid ? trimmedHash.toLowerCase() : undefined,
    };
  }

  /**
   * Gets all supported blockchain formats
   */
  getSupportedFormats(): BlockchainFormat[] {
    return [...this.supportedFormats];
  }

  /**
   * Gets a specific blockchain format by chain ID
   */
  getFormatByChainId(chainId: string): BlockchainFormat | undefined {
    return this.supportedFormats.find(format => format.chainId === chainId);
  }

  /**
   * Validates multiple transaction hashes
   */
  validateMultiple(hashes: string[], chainId?: string): ValidationResult[] {
    return hashes.map(hash => this.validateFormat(hash, chainId));
  }

  /**
   * Creates a standardized error response for validation failures
   */
  createErrorResponse(validationResult: ValidationResult, field: string = 'paymentTransactionHash'): any {
    return {
      status: false,
      message: 'Transaction hash validation failed',
      error: validationResult.errors[0] || 'Invalid transaction hash format',
      details: {
        field,
        code: this.getErrorCode(validationResult.errors[0]),
        expectedFormat: '0x followed by either 64 hex characters (66 total) or 40 hex characters (42 total)',
        providedValue: 'Invalid or malformed hash',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validates a transaction hash with detailed error information
   */
  validateWithDetails(hash: string, chainId?: string): {
    isValid: boolean;
    errors: Array<{ code: ValidationErrorCode; message: string; field: string }>;
    normalizedHash?: string;
  } {
    const detailedErrors: Array<{ code: ValidationErrorCode; message: string; field: string }> = [];

    if (!hash || hash.trim() === '') {
      detailedErrors.push({
        code: ValidationErrorCode.EMPTY_HASH,
        message: 'Transaction hash cannot be empty',
        field: 'paymentTransactionHash',
      });
      return { isValid: false, errors: detailedErrors };
    }

    const trimmedHash = hash.trim();

    if (!trimmedHash.startsWith('0x')) {
      detailedErrors.push({
        code: ValidationErrorCode.INVALID_PREFIX,
        message: 'Transaction hash must start with "0x"',
        field: 'paymentTransactionHash',
      });
    }

    if (trimmedHash.length !== 66 && trimmedHash.length !== 42) {
      detailedErrors.push({
        code: ValidationErrorCode.INVALID_LENGTH,
        message: `Transaction hash must be either 66 characters (full format) or 42 characters (system format), got ${trimmedHash.length}`,
        field: 'paymentTransactionHash',
      });
    }

    const fullHashPattern = /^0x[a-fA-F0-9]{64}$/;
    const systemHashPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!fullHashPattern.test(trimmedHash) && !systemHashPattern.test(trimmedHash)) {
      detailedErrors.push({
        code: ValidationErrorCode.INVALID_CHARACTERS,
        message: 'Transaction hash contains invalid characters. Only hexadecimal characters (0-9, a-f, A-F) are allowed',
        field: 'paymentTransactionHash',
      });
    }

    if (chainId) {
      const chainFormat = this.supportedFormats.find(format => format.chainId === chainId);
      if (chainFormat && !chainFormat.pattern.test(trimmedHash)) {
        detailedErrors.push({
          code: ValidationErrorCode.FORMAT_INVALID,
          message: `Transaction hash format is invalid for ${chainFormat.name} (Chain ID: ${chainId})`,
          field: 'paymentTransactionHash',
        });
      }
    }

    const isValid = detailedErrors.length === 0;

    return {
      isValid,
      errors: detailedErrors,
      normalizedHash: isValid ? trimmedHash.toLowerCase() : undefined,
    };
  }

  /**
   * Quick validation method that returns boolean
   */
  isValidHash(hash: string, chainId?: string): boolean {
    return this.validateFormat(hash, chainId).isValid;
  }

  /**
   * Validates and normalizes a transaction hash
   */
  normalizeHash(hash: string): string | null {
    const result = this.validateFormat(hash);
    return result.isValid ? result.normalizedHash! : null;
  }

  /**
   * Creates a user-friendly error message for validation failures
   */
  getUserFriendlyError(validationResult: ValidationResult): string {
    if (validationResult.isValid) {
      return '';
    }

    const primaryError = validationResult.errors[0];
    
    if (primaryError.includes('empty')) {
      return 'Please provide a transaction hash for payment verification.';
    }
    
    if (primaryError.includes('start with')) {
      return 'Transaction hash must start with "0x". Please check your transaction hash format.';
    }
    
    if (primaryError.includes('characters') && (primaryError.includes('66') || primaryError.includes('42'))) {
      return 'Transaction hash must be either 66 characters (full blockchain format) or 42 characters (system format). Please verify your transaction hash.';
    }
    
    if (primaryError.includes('invalid characters')) {
      return 'Transaction hash contains invalid characters. Please ensure it only contains numbers (0-9) and letters (a-f, A-F).';
    }
    
    return 'Invalid transaction hash format. Please provide a valid blockchain transaction hash.';
  }

  /**
   * Detects the format type of a transaction hash
   */
  detectHashFormat(hash: string): 'full' | 'system' | 'invalid' {
    if (!hash || !hash.startsWith('0x')) {
      return 'invalid';
    }

    const trimmedHash = hash.trim();
    
    if (trimmedHash.length === 66 && /^0x[a-fA-F0-9]{64}$/.test(trimmedHash)) {
      return 'full';
    }
    
    if (trimmedHash.length === 42 && /^0x[a-fA-F0-9]{40}$/.test(trimmedHash)) {
      return 'system';
    }
    
    return 'invalid';
  }

  /**
   * Maps error messages to error codes
   */
  private getErrorCode(errorMessage: string): ValidationErrorCode {
    if (!errorMessage) return ValidationErrorCode.FORMAT_INVALID;
    
    if (errorMessage.includes('empty')) return ValidationErrorCode.EMPTY_HASH;
    if (errorMessage.includes('start with')) return ValidationErrorCode.INVALID_PREFIX;
    if (errorMessage.includes('characters long')) return ValidationErrorCode.INVALID_LENGTH;
    if (errorMessage.includes('invalid characters')) return ValidationErrorCode.INVALID_CHARACTERS;
    
    return ValidationErrorCode.FORMAT_INVALID;
  }
}