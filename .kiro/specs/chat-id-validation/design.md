# Design Document

## Overview

This design implements comprehensive chatId validation for the Web3 NFT minting endpoint and other chat-related endpoints. The solution creates a dedicated DTO for mint requests with proper UUID validation, implements a reusable chatId validator service, and ensures consistent error handling across the application.

## Architecture

The validation system follows NestJS best practices using:
- **DTO Layer**: Request validation using class-validator decorators
- **Service Layer**: Reusable validation logic for complex scenarios
- **Controller Layer**: Standardized error responses
- **Global Validation**: Leveraging existing ValidationPipe configuration

## Components and Interfaces

### 1. MintNFTRequestDto

A new DTO class specifically for the `/web3/nft/mint` endpoint:

```typescript
export class MintNFTRequestDto {
  @IsUUID(4, { message: 'chatId must be a valid UUID' })
  chatId: string;

  @IsString()
  @IsNotEmpty({ message: 'selectedVariation is required' })
  selectedVariation: string;

  @IsString()
  @IsNotEmpty({ message: 'paymentTransactionHash is required' })
  paymentTransactionHash: string;
}
```

### 2. ChatIdValidatorService

A dedicated service for advanced chatId validation scenarios:

```typescript
export interface ChatIdValidationResult {
  isValid: boolean;
  chatId?: string;
  errors: string[];
  exists?: boolean;
  hasAccess?: boolean;
}

@Injectable()
export class ChatIdValidatorService {
  async validateChatAccess(chatId: string, userId: string): Promise<ChatIdValidationResult>;
  async validateChatExists(chatId: string): Promise<ChatIdValidationResult>;
  createValidationError(result: ChatIdValidationResult): HttpException;
}
```

### 3. Updated Web3Controller

Modified controller method with proper DTO validation:

```typescript
@Post('nft/mint')
@UseGuards(JwtAuthGuard)
async mintDesign(@Req() req, @Body() body: MintNFTRequestDto) {
  // Implementation with validated chatId
}
```

## Data Models

### Validation Error Response Format

```typescript
interface ValidationErrorResponse {
  status: false;
  message: string;
  errors: Array<{
    field: string;
    value: any;
    constraints: Record<string, string>;
  }>;
  path: string;
  timestamp: string;
}
```

### Chat Access Validation

The system will validate:
- **UUID Format**: Ensures chatId follows UUID v4 format
- **Chat Existence**: Verifies the chat exists in the database
- **User Access**: Confirms the user has access to the chat (creator or participant)

## Error Handling

### Validation Error Types

1. **Format Errors**: Invalid UUID format
   - Status Code: 400 Bad Request
   - Message: "chatId must be a valid UUID"

2. **Not Found Errors**: Chat doesn't exist
   - Status Code: 404 Not Found
   - Message: "Chat not found"

3. **Access Denied Errors**: User lacks permission
   - Status Code: 403 Forbidden
   - Message: "Access denied to chat"

### Error Response Structure

All validation errors follow a consistent format:

```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "chatId",
      "value": "chat-456",
      "constraints": {
        "isUuid": "chatId must be a valid UUID"
      }
    }
  ],
  "path": "/web3/nft/mint",
  "timestamp": "2025-09-05T15:44:03.702Z"
}
```

## Testing Strategy

### Unit Tests

1. **DTO Validation Tests**
   - Valid UUID formats pass validation
   - Invalid formats trigger appropriate errors
   - Missing fields are caught
   - Error messages are user-friendly

2. **ChatIdValidatorService Tests**
   - Chat existence validation
   - User access permission checks
   - Error response generation
   - Edge cases (deleted chats, invalid users)

3. **Controller Integration Tests**
   - End-to-end request validation
   - Error response format consistency
   - Logging verification

### Test Cases

```typescript
describe('MintNFTRequestDto', () => {
  it('should accept valid UUID chatId');
  it('should reject invalid UUID formats');
  it('should require all mandatory fields');
  it('should provide clear error messages');
});

describe('ChatIdValidatorService', () => {
  it('should validate chat existence');
  it('should check user access permissions');
  it('should handle non-existent chats gracefully');
  it('should return structured validation results');
});
```

### Integration Testing

- Test complete request flow from controller to database
- Verify error handling doesn't break existing functionality
- Ensure transaction hash validation still works correctly
- Validate logging and monitoring integration

## Implementation Notes

### Backward Compatibility

- Existing endpoints using chatId validation (in chat.dto.ts) remain unchanged
- New validation only affects the Web3 mint endpoint initially
- Gradual rollout to other endpoints as needed

### Performance Considerations

- UUID validation is lightweight (regex-based)
- Database queries for chat existence are optimized with indexes
- Validation failures fail fast to minimize resource usage

### Security Implications

- Prevents SQL injection through malformed UUIDs
- Ensures users can only access authorized chats
- Maintains audit trail through proper logging