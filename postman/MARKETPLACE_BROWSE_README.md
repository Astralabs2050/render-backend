# Marketplace Browse API Documentation

## Overview
The Marketplace Browse API allows users to search, filter, and browse NFT designs that are listed for sale on the marketplace.

## Endpoints

### 1. Browse Marketplace
**GET** `/marketplace/browse`

Browse all listed NFT designs with search and filter capabilities.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Search by name or description | `"summer dress"` |
| `category` | enum | No | Filter by category (Dresses, Tops, Bottoms) | `"Dresses"` |
| `minPrice` | number | No | Minimum price filter | `50` |
| `maxPrice` | number | No | Maximum price filter | `500` |
| `creators` | string[] | No | Filter by creator IDs (comma-separated) | `"uuid1,uuid2"` |
| `region` | string | No | Filter by delivery region | `"North America"` |
| `sortBy` | enum | No | Sort order | `"price_asc"`, `"newest"`, etc. |
| `limit` | number | No | Items per page (1-100) | `20` |
| `offset` | number | No | Pagination offset | `0` |

#### Available Categories
- `Dresses` - Dresses, gowns, and dress-like garments
- `Tops` - Shirts, blouses, t-shirts, tanks, jackets, coats, blazers, suits, and upper body wear
- `Bottoms` - Pants, jeans, shorts, skirts, and lower body wear

#### Sort Options
- `price_asc` - Price: Low to High
- `price_desc` - Price: High to Low  
- `newest` - Newest First
- `oldest` - Oldest First
- `name_asc` - Name: A to Z
- `name_desc` - Name: Z to A

#### Example Request
```
GET /marketplace/browse?search=summer&category=Dresses&minPrice=50&maxPrice=200&sortBy=price_asc&limit=10
```

#### Response
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Summer Floral Dress",
      "description": "Beautiful summer dress with floral patterns",
      "category": "Dresses",
      "price": 150,
      "quantity": 10,
      "imageUrl": "https://...",
      "status": "listed",
      "createdAt": "2024-01-15T10:30:00Z",
      "creator": {
        "id": "creator-uuid",
        "fullName": "Fashion Designer",
        "profilePicture": "https://..."
      },
      "metadata": {
        "deliveryWindow": "2-3 weeks",
        "brandStory": "Sustainable fashion...",
        "regionOfDelivery": "North America, Europe"
      }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "filters": {
    "categories": ["Dresses", "Tops", "Bottoms"],
    "priceRange": { "min": 25, "max": 500 },
    "regions": ["North America", "Europe", "Asia"]
  }
}
```

### 2. Get Marketplace Item
**GET** `/marketplace/items/:id`

Get detailed information about a specific marketplace item.

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | NFT ID |

#### Example Request
```
GET /marketplace/items/550e8400-e29b-41d4-a716-446655440000
```

#### Response
```json
{
  "status": true,
  "message": "Marketplace item retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Summer Floral Dress",
    "description": "Beautiful summer dress with floral patterns",
    "category": "Dresses",
    "price": 150,
    "quantity": 10,
    "imageUrl": "https://...",
    "status": "listed",
    "createdAt": "2024-01-15T10:30:00Z",
    "creator": {
      "id": "creator-uuid",
      "fullName": "Fashion Designer",
      "profilePicture": "https://..."
    },
    "metadata": {
      "deliveryWindow": "2-3 weeks",
      "brandStory": "Sustainable fashion meets modern design...",
      "regionOfDelivery": "North America, Europe"
    }
  }
}
```

## Usage Examples

### Basic Search
```
GET /marketplace/browse?search=dress
```

### Category Filter
```
GET /marketplace/browse?category=Tops
```

### Browse Bottoms
```
GET /marketplace/browse?category=Bottoms
```

### Price Range Filter
```
GET /marketplace/browse?minPrice=100&maxPrice=300
```

### Multiple Filters with Sorting
```
GET /marketplace/browse?category=Dresses&minPrice=50&region=Europe&sortBy=price_asc&limit=20
```

### Pagination
```
GET /marketplace/browse?limit=10&offset=20
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Marketplace item not found",
  "error": "Not Found"
}
```

## Notes

1. **Public Access**: Both endpoints are public and don't require authentication
2. **Performance**: Results are optimized with database indexing on commonly filtered fields
3. **Filtering**: All text searches are case-insensitive
4. **Availability**: Only shows NFTs with `status: "listed"` and `quantity > 0`
5. **Metadata**: Additional marketplace information is stored in the `metadata` field
6. **Pagination**: Default limit is 20 items, maximum is 100
7. **Filter Options**: The browse endpoint returns available filter options for building dynamic UIs