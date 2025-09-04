# Design Document

## Overview

The inventory by ID endpoint will provide creators with the ability to retrieve detailed information about a specific design in their inventory. This endpoint extends the existing creator inventory functionality by offering focused access to individual designs, supporting use cases like design detail views, editing forms, and maker hiring workflows.

The implementation will leverage the existing authentication, authorization, and data access patterns established in the CreatorController and DesignService, ensuring consistency with the current architecture.

## Architecture

### Endpoint Structure
- **Route**: `GET /creator/inventory/:id`
- **Controller**: CreatorController (existing)
- **Service**: DesignService (extend existing)
- **Guards**: JwtAuthGuard, RoleGuard (existing)
- **Role**: CREATOR (existing)

### Request Flow
1. Client sends GET request with design ID parameter
2. JwtAuthGuard validates authentication token
3. RoleGuard validates CREATOR role
4. Controller validates UUID format of design ID
5. Service retrieves design from database
6. Controller validates design ownership
7. Response formatted and returned

## Components and Interfaces

### Controller Method
```typescript
@Get('inventory/:id')
async getInventoryById(
  @Param('id', ParseUUIDPipe) designId: string,
  @Req() req
): Promise<StandardApiResponse<CreateDesignInventoryDto>>
```

### Service Method Extension
```typescript
async getInventoryById(
  designId: string, 
  creatorId: string
): Promise<CreateDesignInventoryDto | null>
```

### Response DTO
The endpoint will reuse the existing `CreateDesignInventoryDto` to maintain consistency:
```typescript
{
  id: string;
  name: string;
  price: number;
  quantity: number;
  publishedStatus: NFTStatus;
  designLink: string;
  lastUpdated: Date;
}
```

### Standard Response Format
```typescript
{
  status: boolean;
  message: string;
  data: CreateDesignInventoryDto;
}
```

## Data Models

### Database Query
The service will query the NFT entity with the following specifications:
- **Table**: `nfts`
- **Where Conditions**: 
  - `id = designId`
  - `creatorId = authenticatedCreatorId`
- **Selected Fields**: `id`, `name`, `price`, `quantity`, `status`, `imageUrl`, `updatedAt`

### Field Mapping
| Database Field | DTO Field | Type | Default |
|---------------|-----------|------|---------|
| id | id | string | - |
| name | name | string | - |
| price | price | number | 0 |
| quantity | quantity | number | 0 |
| status | publishedStatus | NFTStatus | - |
| imageUrl | designLink | string | - |
| updatedAt | lastUpdated | Date | - |

## Error Handling

### Error Scenarios and Responses

#### 1. Invalid UUID Format (400 Bad Request)
```typescript
{
  status: false,
  message: "Invalid design ID format",
  data: null
}
```

#### 2. Design Not Found (404 Not Found)
```typescript
{
  status: false,
  message: "Design not found",
  data: null
}
```

#### 3. Unauthorized Access (403 Forbidden)
```typescript
{
  status: false,
  message: "Design does not belong to you",
  data: null
}
```

#### 4. Database Error (500 Internal Server Error)
```typescript
{
  status: false,
  message: "Failed to retrieve design",
  data: null
}
```

### Error Handling Strategy
- Use NestJS built-in `ParseUUIDPipe` for UUID validation
- Implement ownership validation in controller
- Use existing error handling patterns from DesignService
- Log all errors for debugging purposes
- Return consistent error response format

## Testing Strategy

### Unit Tests
1. **Controller Tests**
   - Valid design ID with correct ownership
   - Invalid UUID format handling
   - Design not found scenarios
   - Ownership validation
   - Authentication/authorization edge cases

2. **Service Tests**
   - Database query execution
   - Data transformation accuracy
   - Error handling for database failures
   - Null/undefined value handling

### Integration Tests
1. **End-to-End API Tests**
   - Complete request/response cycle
   - Authentication flow validation
   - Role-based access control
   - Database interaction verification

### Test Data Requirements
- Test creator user with CREATOR role
- Test NFT designs owned by test creator
- Test NFT designs owned by different creators
- Invalid UUID test cases

### Security Testing
- Verify JWT token validation
- Confirm role-based access restrictions
- Test ownership validation logic
- Validate input sanitization

## Implementation Notes

### Consistency Considerations
- Reuse existing `CreateDesignInventoryDto` for response consistency
- Follow established error handling patterns from other creator endpoints
- Maintain consistent logging approach with existing DesignService methods
- Use existing validation pipes and guards

### Performance Considerations
- Single database query with specific field selection
- Indexed lookup by primary key (id) and creatorId
- No additional joins required beyond existing patterns
- Minimal data transformation overhead

### Security Considerations
- Ownership validation prevents unauthorized access to designs
- UUID validation prevents injection attacks
- Existing authentication/authorization patterns maintained
- No sensitive data exposure in error messages