import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../../ai-chat/entities/chat.entity';

export interface ChatIdValidationResult {
  isValid: boolean;
  chatId?: string;
  errors: string[];
  exists?: boolean;
  hasAccess?: boolean;
}

@Injectable()
export class ChatIdValidatorService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  /**
   * Validates that a chat exists and user has access to it
   */
  async validateChatAccess(chatId: string, userId: string): Promise<ChatIdValidationResult> {
    try {
      // First check if chat exists
      const existsResult = await this.validateChatExists(chatId);
      if (!existsResult.isValid) {
        return existsResult;
      }

      // Check if user has access (is creator or participant)
      const chat = await this.chatRepository.findOne({
        where: [
          { id: chatId, userId: userId },
          { id: chatId, creatorId: userId },
        ],
      });

      if (!chat) {
        return {
          isValid: false,
          chatId,
          errors: ['Access denied to chat'],
          exists: true,
          hasAccess: false,
        };
      }

      return {
        isValid: true,
        chatId,
        errors: [],
        exists: true,
        hasAccess: true,
      };
    } catch (error) {
      return {
        isValid: false,
        chatId,
        errors: [`Chat validation failed: ${error.message}`],
        exists: false,
        hasAccess: false,
      };
    }
  }

  /**
   * Validates that a chat exists in the database
   */
  async validateChatExists(chatId: string): Promise<ChatIdValidationResult> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
      });

      if (!chat) {
        return {
          isValid: false,
          chatId,
          errors: ['Chat not found'],
          exists: false,
        };
      }

      return {
        isValid: true,
        chatId,
        errors: [],
        exists: true,
      };
    } catch (error) {
      return {
        isValid: false,
        chatId,
        errors: [`Database error: ${error.message}`],
        exists: false,
      };
    }
  }

  /**
   * Creates an appropriate HTTP exception based on validation result
   */
  createValidationError(result: ChatIdValidationResult): HttpException {
    if (!result.exists) {
      return new HttpException(
        {
          status: false,
          message: 'Chat not found',
          errors: result.errors,
          path: '/web3/nft/mint',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!result.hasAccess) {
      return new HttpException(
        {
          status: false,
          message: 'Access denied to chat',
          errors: result.errors,
          path: '/web3/nft/mint',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Generic validation error
    return new HttpException(
      {
        status: false,
        message: 'Chat validation failed',
        errors: result.errors,
        path: '/web3/nft/mint',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}