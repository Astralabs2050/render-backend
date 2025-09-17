# Design Document

## Overview

This design refactors marketplace endpoints to follow REST conventions by consolidating marketplace operations under a single `/marketplace` path. The publish functionality will be moved from the creator controller to the marketplace controller, creating a cleaner and more intuitive API structure while maintaining backward compatibility during the transition.

## Architecture

The refactor follows these principles:
- **Resource-based URLs**: `/marketplace` represents the marketplace resource
- **HTTP method semantics**: GET for retrieval, POST for creation
- **Controller consolidation**: Single marketplace controller for all marketplace operations
- **Backward compatibility**: Gradual migration with deprecation warnings

## Components and Interfaces

### 1. Updated Marketplace Controller

The marketplace controller will be enhanced to handle both browsing and publishing:

```typescript
@Controller('marketplace')
export class MarketplaceController {
  // New consolidated endpoints
  @Get() // GET /marketplace - Browse marketplace
  async browseMarketplace(@Query() filters: MarketplaceFilterDto);

  @Post() // POST /marketplace - Publish to marketplace  
  @UseGuards(JwtAuthGuard)
  async publishToMarketplace(@Body() publishDto: PublishMarketplaceDto, @Request() req);

  // Existing endpoints remain unchanged
  @Get('items/:id')
  async getMarketplaceItem(@Param('id') id: string);

  @Get('stats') 
  async getMarketplaceStats(@Request() req);
}
```

### 2. Creator Controller Deprecation

The creator controller will maintain the old endpoint with deprecation warnings:

```typescript
@Controller('creator')
export class CreatorController {
  @Post('publish-marketplace')
  @Deprecated('Use POST /marketplace instead')
  async publishToMarketplace(@Body() publishDto: PublishMarketplaceDto, @Req() req) {
    // Log deprecation warning
    // Delegate to marketplace service
    // Return response with deprecation notice
  }
}
```

### 3. Marketplace Service Enhancement

The marketplace service will be updated to handle publishing operations:

```typescript
@Injectable()
export class MarketplaceService {
  async publishToMarketplace(publishDto: PublishMarketplaceDto, userId: string): Promise<any>;
  async browseMarketplace(filters: MarketplaceFilterDto): Promise<any>;
  // Existing methods remain unchanged
}
```

## Data Models

### Request/Response Formats

The request and response formats remain identical to maintain compatibility:

**Publish Request (POST /marketplace)**:
```typescript
{
  designId: string;
  pricePerOutfit: number;
  quantityAvailable: number;
  deliveryWindow: string;
  brandStory: string;
  regionOfDelivery: string;
}
```

**Browse Request (GET /marketplace)**:
```typescript
// Query parameters
{
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  region?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}
```

### Deprecation Response Headers

Deprecated endpoints will include headers indicating the new endpoint:

```typescript
{
  'X-Deprecated': 'true',
  'X-Deprecated-Replacement': 'POST /marketplace',
  'X-Deprecated-Date': '2025-09-05',
  'X-Sunset-Date': '2025-12-05'
}
```

## Error Handling

### Validation Errors

Both endpoints maintain the same validation rules and error responses:

```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "designId",
      "constraints": {
        "isUuid": "designId must be a valid UUID"
      }
    }
  ]
}
```

### Business Logic Errors

Error handling remains consistent with existing patterns:

- **Design not found**: 404 Not Found
- **Design not minted**: 400 Bad Request with specific guidance
- **Unauthorized access**: 403 Forbidden
- **Already published**: 409 Conflict

### Deprecation Warnings

Deprecated endpoints will log warnings and include deprecation information in responses:

```json
{
  "status": true,
  "message": "Design published to marketplace successfully",
  "data": { /* existing data */ },
  "deprecation": {
    "warning": "This endpoint is deprecated. Use POST /marketplace instead.",
    "newEndpoint": "POST /marketplace",
    "sunsetDate": "2025-12-05"
  }
}
```

## Testing Strategy

### Unit Tests

1. **Marketplace Controller Tests**
   - Test new GET /marketplace endpoint functionality
   - Test new POST /marketplace endpoint functionality
   - Verify authentication and authorization
   - Test error handling and validation

2. **Creator Controller Tests**
   - Test deprecated endpoint still works
   - Verify deprecation warnings are logged
   - Test deprecation headers are included
   - Ensure delegation to marketplace service works

3. **Marketplace Service Tests**
   - Test publish functionality moved from creator service
   - Verify browse functionality remains unchanged
   - Test error handling consistency

### Integration Tests

1. **Endpoint Compatibility Tests**
   - Verify old and new endpoints return identical responses
   - Test that authentication works on both endpoints
   - Ensure validation behaves consistently

2. **Migration Tests**
   - Test gradual migration scenarios
   - Verify deprecation warnings appear in logs
   - Test sunset behavior when old endpoints are disabled

### API Documentation Tests

- Verify OpenAPI/Swagger documentation reflects new endpoints
- Test that deprecation notices appear in API docs
- Ensure migration guides are accurate

## Implementation Notes

### Migration Strategy

1. **Phase 1**: Implement new endpoints alongside existing ones
2. **Phase 2**: Add deprecation warnings to old endpoints
3. **Phase 3**: Update documentation and notify API consumers
4. **Phase 4**: Remove old endpoints after deprecation period

### Logging and Monitoring

- Log all calls to deprecated endpoints with user identification
- Monitor usage patterns to determine when it's safe to remove old endpoints
- Track adoption of new endpoints

### Service Layer Refactoring

The publish functionality will be moved from the design service to the marketplace service to better align with the new controller structure:

```typescript
// Before: CreatorController -> DesignService -> NFTService
// After: MarketplaceController -> MarketplaceService -> NFTService
```

This creates better separation of concerns and makes the codebase more maintainable.