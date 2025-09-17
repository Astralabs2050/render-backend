# Implementation Plan

- [ ] 1. Move publish functionality to MarketplaceService
  - Extract publish logic from CreatorController into MarketplaceService
  - Create publishToMarketplace method in MarketplaceService
  - Update method to accept userId parameter and PublishMarketplaceDto
  - Ensure all existing validation and business logic is preserved
  - _Requirements: 2.1, 2.2, 1.3, 1.4_

- [ ] 2. Add new REST endpoints to MarketplaceController
  - Add GET /marketplace endpoint that delegates to existing browseMarketplace method
  - Add POST /marketplace endpoint that uses new MarketplaceService.publishToMarketplace
  - Apply proper authentication guards to POST endpoint
  - Maintain existing response format for both endpoints
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [ ] 3. Update existing browse endpoint to support root path
  - Modify existing GET /marketplace/browse to also respond to GET /marketplace
  - Ensure query parameter handling remains identical
  - Maintain backward compatibility for /marketplace/browse path
  - _Requirements: 1.2, 1.3, 3.1_

- [ ] 4. Add deprecation support to CreatorController
  - Create deprecation decorator or utility for marking endpoints as deprecated
  - Update existing publish-marketplace endpoint to include deprecation warnings
  - Add deprecation headers to response (X-Deprecated, X-Deprecated-Replacement, etc.)
  - Implement logging for deprecated endpoint usage
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 5. Update CreatorController to delegate to MarketplaceService
  - Modify existing publish-marketplace endpoint to use MarketplaceService instead of direct logic
  - Ensure response format remains identical for backward compatibility
  - Add deprecation notice to response body
  - Maintain all existing error handling behavior
  - _Requirements: 2.2, 3.1, 3.3_

- [ ] 6. Create unit tests for new MarketplaceService methods
  - Write tests for publishToMarketplace method functionality
  - Test error handling scenarios (design not found, not minted, etc.)
  - Verify proper validation of input parameters
  - Test integration with NFTService and other dependencies
  - _Requirements: 1.3, 1.4, 2.1_

- [ ] 7. Create unit tests for updated MarketplaceController
  - Test new GET /marketplace endpoint behavior
  - Test new POST /marketplace endpoint with authentication
  - Verify proper error responses and status codes
  - Test that existing functionality remains unchanged
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [ ] 8. Create integration tests for endpoint compatibility
  - Test that old and new publish endpoints return identical responses
  - Verify deprecation headers are included in old endpoint responses
  - Test authentication and authorization on both old and new endpoints
  - Ensure validation behaves consistently across both endpoints
  - _Requirements: 3.1, 3.2, 1.3, 1.4_