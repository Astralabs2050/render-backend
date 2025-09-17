# Implementation Plan

- [x] 1. Create MintNFTRequestDto with UUID validation
  - Create new DTO file in web3 module with proper UUID validation decorators
  - Add validation for chatId, selectedVariation, and paymentTransactionHash fields
  - Include clear error messages for each validation rule
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2. Create ChatIdValidatorService for advanced validation
  - Implement service class with chat existence and access validation methods
  - Create validation result interface with structured error information
  - Add methods for checking user permissions and chat availability
  - Write error response generation utilities
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Update Web3Controller to use new DTO
  - Replace inline body type with MintNFTRequestDto in mint endpoint
  - Update method signature to use validated DTO
  - Ensure existing error handling works with new validation
  - _Requirements: 1.1, 1.2, 3.3_

- [x] 4. Register ChatIdValidatorService in Web3Module
  - Add service to providers array in web3.module.ts
  - Ensure proper dependency injection setup
  - _Requirements: 2.1, 2.2_

- [x] 5. Create unit tests for MintNFTRequestDto validation
  - Write tests for valid UUID acceptance
  - Test invalid UUID format rejection
  - Verify required field validation
  - Test error message clarity and format
  - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2_

- [x] 6. Create unit tests for ChatIdValidatorService
  - Test chat existence validation logic
  - Test user access permission checking
  - Test error response generation
  - Test edge cases with non-existent chats and users
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 7. Create integration tests for Web3Controller mint endpoint
  - Test complete request validation flow
  - Verify error response format consistency
  - Test that existing transaction hash validation still works
  - Ensure proper logging of validation failures
  - _Requirements: 1.1, 1.2, 1.3, 3.3_

- [ ] 8. Update error handling in NFTService
  - Enhance mintFromChatDesign method to handle validation errors gracefully
  - Ensure database queries use validated chatId format
  - Add proper error logging for validation failures
  - _Requirements: 2.4, 3.3_