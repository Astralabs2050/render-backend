# Creator Inventory API - Postman Collection

This collection provides comprehensive testing for the Creator Inventory endpoints, including the new "Get Inventory by ID" functionality.

## 📋 Endpoints Included

### 1. **Get Creator Inventory** 
- **Endpoint:** `GET /creator/inventory`
- **Description:** Retrieves all designs in the creator's inventory
- **Auto-sets:** `design_id` variable from the first design for subsequent requests

### 2. **Get Inventory by ID** ⭐ NEW
- **Endpoint:** `GET /creator/inventory/:id`
- **Description:** Retrieves a specific design by ID with detailed information
- **Returns:** ID, name, price, quantity, status, image link, and lastUpdated
- **Uses:** `{{design_id}}` variable (auto-set from inventory list)

### 3. **Mint NFT from Chat Design**
- **Endpoint:** `POST /web3/nft/mint`
- **Description:** Mints an NFT from AI-generated design

### 4. **Health Check**
- **Endpoint:** `GET /health`
- **Description:** Server health verification

## 🔧 Environment Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `base_url` | API base URL | `http://localhost:3000` |
| `auth_token` | JWT authentication token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `design_id` | Design ID for testing | `550e8400-e29b-41d4-a716-446655440000` |
| `chat_id` | Chat ID for minting | `chat-123-example` |

## 🚀 Quick Start

### 1. **Setup Authentication**
   - Set your `auth_token` in the collection variables
   - Ensure you have a user with CREATOR role

### 2. **Test Workflow**
   1. Run **"Get Creator Inventory"** first
      - ✅ This automatically sets `design_id` from the first design
   2. Run **"Get Inventory by ID"** 
      - ✅ Uses the auto-set `design_id`
      - ✅ Tests the new endpoint functionality

### 3. **Manual Testing**
   - Update `design_id` variable manually to test specific designs
   - Test with invalid UUIDs to verify error handling

## 📊 Response Examples

### Get Inventory by ID - Success (200)
```json
{
  "status": true,
  "message": "Design retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Summer Collection Dress",
    "price": 150,
    "quantity": 1,
    "publishedStatus": "listed",
    "designLink": "https://res.cloudinary.com/example/image/upload/v123/summer-dress.jpg",
    "lastUpdated": "2025-08-28T23:30:00.000Z"
  }
}
```

### Error Responses
- **400:** Invalid UUID format
- **401:** Unauthorized (missing/invalid token)
- **403:** Forbidden (non-creator role)
- **404:** Design not found or doesn't belong to creator

## 🧪 Automated Tests

The collection includes comprehensive automated tests:

### ✅ **Response Validation**
- Status code verification (200, 400, 401, 403, 404)
- Response structure validation
- Response time checks (< 2000ms)

### ✅ **Data Structure Tests**
- All required fields present (id, name, price, quantity, status, imageUrl, lastUpdated)
- Correct data types validation
- Array vs single object detection

### ✅ **Auto-Variable Setting**
- Automatically extracts `design_id` from inventory list
- Logs variable updates for debugging

## 🔍 Testing Scenarios

### **Valid Requests**
- ✅ Get inventory list with multiple designs
- ✅ Get specific design by valid ID
- ✅ Handle designs with null/zero values

### **Error Scenarios**
- ✅ Invalid UUID format (`invalid-uuid`)
- ✅ Non-existent design ID
- ✅ Design belonging to different creator
- ✅ Missing authentication
- ✅ Wrong user role

## 💡 Tips

1. **Run inventory list first** to auto-populate `design_id`
2. **Check console logs** for variable updates and debugging info
3. **Use different design IDs** to test ownership validation
4. **Test with non-creator users** to verify role restrictions

## 🔗 Related Collections

- `Hire_Maker_API.postman_collection.json` - Uses inventory data for maker hiring
- `Design_Workflow_API.postman_collection.json` - Complete design creation flow

---

**Note:** Ensure your backend server is running on the configured `base_url` before testing.