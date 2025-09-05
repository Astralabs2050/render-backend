# Requirements Document

## Introduction

The system currently accepts invalid chatId formats in the Web3 NFT minting endpoint, causing database UUID validation errors. When users provide non-UUID chatId values like "chat-456", the system fails with "invalid input syntax for type uuid" errors. This feature will implement proper chatId validation to ensure only valid UUID formats are accepted and provide clear error messages for invalid inputs.

## Requirements

### Requirement 1

**User Story:** As a developer calling the NFT minting API, I want chatId parameters to be validated before database operations, so that I receive clear error messages for invalid formats instead of database errors.

#### Acceptance Criteria

1. WHEN a request is made to `/web3/nft/mint` with an invalid chatId format THEN the system SHALL return a 400 Bad Request error with a clear validation message
2. WHEN a request is made with a valid UUID chatId format THEN the system SHALL proceed with normal processing
3. WHEN a chatId validation fails THEN the system SHALL return an error message indicating the expected UUID format
4. WHEN a chatId is missing from the request THEN the system SHALL return a validation error indicating the required field

### Requirement 2

**User Story:** As a system administrator, I want consistent chatId validation across all endpoints that accept chatId parameters, so that the system maintains data integrity and provides consistent error handling.

#### Acceptance Criteria

1. WHEN any endpoint receives a chatId parameter THEN the system SHALL validate it using the same validation rules
2. WHEN chatId validation is implemented THEN it SHALL be reusable across multiple controllers and services
3. WHEN validation fails THEN the system SHALL log the validation error with appropriate context
4. WHEN validation succeeds THEN the system SHALL normalize the chatId format for consistent processing

### Requirement 3

**User Story:** As a frontend developer, I want clear and actionable error messages when chatId validation fails, so that I can provide helpful feedback to users and debug integration issues.

#### Acceptance Criteria

1. WHEN chatId validation fails THEN the system SHALL return a structured error response with error code, message, and field information
2. WHEN the error response is returned THEN it SHALL include the invalid value that was provided
3. WHEN validation errors occur THEN the system SHALL maintain consistent error response format across all endpoints
4. WHEN multiple validation errors exist THEN the system SHALL return all validation errors in a single response