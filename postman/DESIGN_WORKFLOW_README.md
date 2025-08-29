# 🎨 Design Workflow API Documentation

## 🚀 Complete User Flow Implementation

This API implements the complete design-to-marketplace pipeline as requested:

### **1. AI Chat Design Creation**
- User chats with AI agent for design
- AI generates 3 design variations
- User picks their preferred variety

### **2. Design Approval & Configuration (AI-Driven!)**
- **AI automatically suggests** design name, price, quantity, timeline
- **User just picks variation** and optionally customizes name
- **AI analyzes prompt** to determine complexity, materials, style
- **Smart defaults** for price, quantity, and production timeline
- Design appears in "My Designs" as **DRAFT**

### **3. Minting & Publishing**
- **"Publish to Market"** triggers web3 modal for minting
- **"Hire a Maker"** triggers web3 modal if design is in DRAFT status
- After minting, status changes from DRAFT to **PUBLISHED**
- Published designs appear on market page

---

## 📋 API Endpoints

### **Authentication**
```http
POST /auth/login
```

### **AI Chat Design Creation**
```http
POST /design/create
POST /design/variation
```

### **Design Approval**
```http
POST /design/approve          # Manual approval with all details
POST /design/approve-simple   # AI-driven approval (recommended!)
```

### **Minting & Publishing**
```http
POST /design/publish-to-market
POST /design/mint-and-publish
```

### **Creator Actions**
```http
GET /creator/inventory
POST /creator/hire-maker
```

### **Marketplace Integration**
```http
GET /marketplace/jobs
```

---

## 🔄 Complete Workflow Example

### **Step 1: Create Design via AI Chat**
```bash
curl -X POST http://localhost:3000/design/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a summer dress with floral pattern, short sleeves, and a flared skirt",
    "fabricImageBase64": null
  }'
```

**Response:**
```json
{
  "status": true,
  "message": "Design created and listed successfully!",
  "data": {
    "chat": { "id": "chat-uuid", "state": "design_preview" },
    "designImages": ["url1", "url2", "url3"],
    "nft": { "id": "nft-uuid", "status": "draft" }
  }
}
```

### **Step 2A: AI-Driven Approval (Recommended!)**
```bash
curl -X POST http://localhost:3000/design/approve-simple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "chat-uuid",
    "selectedVariety": "variation_1",
    "useAISuggestions": true,
    "customName": "Summer Floral Dress"
  }'
```

**Response:**
```json
{
  "status": true,
  "message": "🎉 Design 'Summer Floral Dress' approved with AI suggestions!",
  "data": {
    "nft": {
      "id": "nft-uuid",
      "name": "Summer Floral Dress",
      "status": "draft",
      "price": 180,
      "quantity": 6,
      "deadline": "2025-09-28T00:00:00.000Z"
    },
    "aiGenerated": true,
    "nextSteps": [
      "Publish to Market (triggers minting)",
      "Hire a Maker (triggers minting if in DRAFT status)"
    ]
  }
}
```

### **Step 2B: Manual Approval (Full Control)**
```bash
curl -X POST http://localhost:3000/design/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "chat-uuid",
    "selectedVariety": "variation_1",
    "designName": "Summer Floral Dress",
    "price": 150.00,
    "collectionQuantity": 8,
    "deadline": "2025-12-31",
    "description": "Elegant summer dress with floral pattern"
  }'
```

**Response:**
```json
{
  "status": true,
  "message": "Design 'Summer Floral Dress' approved! It's now in DRAFT status.",
  "data": {
    "nft": {
      "id": "nft-uuid",
      "name": "Summer Floral Dress",
      "status": "draft",
      "price": 150.00,
      "quantity": 8,
      "deadline": "2025-12-31T00:00:00.000Z"
    },
    "nextSteps": [
      "Publish to Market (triggers minting)",
      "Hire a Maker (triggers minting if in DRAFT status)"
    ]
  }
}
```

### **Step 3: Publish to Market (Triggers Web3)**
```bash
curl -X POST http://localhost:3000/design/publish-to-market \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nftId": "nft-uuid"
  }'
```

**Response:**
```json
{
  "status": true,
  "message": "Ready to mint design! Please complete the web3 transaction.",
  "data": {
    "nftId": "nft-uuid",
    "action": "mint_and_publish",
    "web3Required": true
  }
}
```

### **Step 4: Mint and Publish (After Web3 Transaction)**
```bash
curl -X POST http://localhost:3000/design/mint-and-publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nftId": "nft-uuid",
    "transactionHash": "0x1234567890abcdef..."
  }'
```

**Response:**
```json
{
  "status": true,
  "message": "Design minted and published successfully!",
  "data": {
    "nft": {
      "id": "nft-uuid",
      "status": "published",
      "tokenId": "123",
      "contractAddress": "0x..."
    },
    "status": "published",
    "marketReady": true
  }
}
```

---

## 🎯 Key Features

### **🤖 AI-Driven Design Creation**
- **Automatic prompt analysis** - AI understands design complexity, materials, style
- **Smart pricing** - Based on complexity, materials, and market factors
- **Intelligent quantity suggestions** - Optimized for production efficiency
- **Timeline estimation** - Realistic production deadlines
- **Style detection** - Casual, formal, vintage, modern, bohemian
- **Material recognition** - Silk, leather, cotton, denim, etc.
- **Color extraction** - Automatically identifies colors from prompt

### **Status Flow Management**
```
DRAFT → PUBLISHED → LISTED → SOLD
```

### **Web3 Integration**
- **Automatic minting trigger** when publishing to market
- **Automatic minting trigger** when hiring maker (if in DRAFT status)
- **Status validation** prevents actions on unminted designs

### **Enhanced NFT Fields**
- `designLink` - Link to view design details
- `deadline` - Production deadline
- `status` - Enhanced status flow (draft → published → listed → sold)

### **Marketplace Integration**
- Jobs now include design information (image, pay, stock, link, lastUpdated)
- Seamless connection between designs and marketplace jobs

---

## 🧪 Testing

### **Import Postman Collection**
1. Import `Design_Workflow_API.postman_collection.json`
2. Set `base_url` variable to your server URL
3. Run the collection in sequence

### **Test Scenarios**
1. **Complete Design Flow** - End-to-end testing
2. **Draft Status Validation** - Ensure hiring fails for unminted designs
3. **Web3 Integration** - Test minting triggers
4. **Marketplace Cards** - Verify all required fields are populated

---

## 🚨 Important Notes

### **Web3 Modal Integration**
- Frontend must handle web3 transactions
- Backend provides endpoints to trigger minting
- Transaction hash required for final minting confirmation

### **Status Validation**
- Only DRAFT designs can be minted
- Only PUBLISHED designs can hire makers
- Automatic status transitions prevent invalid operations

### **Database Requirements**
- Run `scripts/run-nft-enhancement.sh` to add new fields
- Run `scripts/run-migration.sh` to add designId to jobs table

---

## 🔧 Setup Instructions

### **1. Run Database Migrations**
```bash
chmod +x scripts/run-nft-enhancement.sh
chmod +x scripts/run-migration.sh

./scripts/run-nft-enhancement.sh
./scripts/run-migration.sh
```

### **2. Test the Workflow**
```bash
# Import Postman collection
# Run authentication
# Test complete design flow
# Verify marketplace integration
```

### **3. Frontend Integration**
- Implement web3 modal for minting
- Handle status transitions
- Display design status in UI
- Integrate with marketplace cards

---

## 🎉 Success!

Your design workflow now supports:
- ✅ AI chat design creation
- ✅ Design approval with customization
- ✅ Automatic web3 minting triggers
- ✅ Status management (DRAFT → PUBLISHED → MARKET)
- ✅ Enhanced marketplace integration
- ✅ Complete user flow from design to market

The marketplace cards will now display all required fields: **image**, **pay**, **stock**, **link**, and **lastUpdated**! 🚀
