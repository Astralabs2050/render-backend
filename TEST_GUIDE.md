# Astra Backend - Test Guide

## 🚀 Quick Start Testing

### 1. Start the Server
```bash
npm run start:dev
```

### 2. Test Authentication (100% Working)
**URL**: http://localhost:3000/auth-test.html

**Test Steps:**
1. ✅ Register new user (email + role selection)
2. ✅ Check server logs for OTP code
3. ✅ Verify OTP
4. ✅ Login with credentials
5. ✅ Get wallet info (auto-created wallet)
6. ✅ Test OAuth login buttons

**Expected Results:**
- User created with encrypted wallet
- JWT tokens generated
- Wallet address displayed

### 3. Test AI Chat (100% Working)
**URL**: http://localhost:3000/ai-chat-test.html

**Test Prompts:**
```
"Design a summer dress with floral patterns"
"Create a streetwear hoodie design"
"Generate a formal business suit concept"
```

**Expected Results:**
- GPT-4o fashion advice
- DALL-E 3 generated design images
- Enhanced fashion-specific responses

### 4. Test Web3 Features (Partially Working)
**URL**: http://localhost:3000/web3-test.html

**Working Tests:**
- ✅ Upload file to IPFS
- ✅ Get chain information
- ✅ Check wallet balance

**Needs Setup:**
- ❌ NFT minting (needs contract deployment)
- ❌ Escrow operations (needs marketplace contract)

### 5. Test API Endpoints

#### Authentication Endpoints
```bash
# Register
curl -X POST http://localhost:3000/auth/signup/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","fullName":"Test User","role":"creator"}'

# Login
curl -X POST http://localhost:3000/auth/signin/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Get wallet info (use JWT from login)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/auth/wallet
```

#### AI Chat Endpoints
```bash
# Send chat message
curl -X POST http://localhost:3000/ai-chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message":"Design a summer dress","chatId":"test-chat"}'

# Generate design
curl -X POST http://localhost:3000/ai-chat/generate-design \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"prompt":"Elegant evening gown","chatId":"test-chat"}'
```

#### Web3 Endpoints
```bash
# Upload to IPFS
curl -X POST http://localhost:3000/web3/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"

# Get chain info
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/web3/chain-info

# Check wallet balance
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/web3/wallet/balance
```

## 🔧 Development Features

### Migration System
```bash
# Check encryption stats
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/admin/migration/stats

# Validate encryption
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/admin/migration/validate
```

### Database Operations
```bash
# Clear database (development only)
node clear-db.js
```

## 🐛 Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check Supabase URL in .env
   - Ensure database is accessible

2. **Thirdweb Errors**
   - Verify THIRDWEB_CLIENT_ID and THIRDWEB_SECRET_KEY
   - Check network connectivity

3. **OpenAI Errors**
   - Verify OPENAI_API_KEY is valid
   - Check API quota/billing

4. **Email/OTP Issues**
   - Check server logs for OTP codes (development mode)
   - Verify email configuration

### Development Logs
```bash
# Watch logs for OTP codes and debugging
npm run start:dev

# Look for lines like:
# [AuthService] DEV MODE: OTP for user@example.com is 123456
```

## ✅ What's Ready for Production

1. **Authentication System** - Complete with security
2. **AI Chat System** - Full GPT-4o + DALL-E integration
3. **Wallet Management** - Encrypted storage + generation
4. **Memory Security** - Enterprise-grade encryption
5. **Migration System** - Production-ready batch processing

## 🚧 What Needs Contract Deployment

1. **NFT Minting** - Deploy NFT collection contract
2. **Escrow System** - Deploy marketplace contract
3. **QR Code Verification** - Needs NFT contracts

## 📊 Test Results Template

```
✅ User Registration: PASS/FAIL
✅ Wallet Creation: PASS/FAIL  
✅ OTP Verification: PASS/FAIL
✅ JWT Authentication: PASS/FAIL
✅ AI Chat Response: PASS/FAIL
✅ Design Generation: PASS/FAIL
✅ IPFS Upload: PASS/FAIL
✅ Chain Info: PASS/FAIL
❌ NFT Minting: NEEDS_CONTRACTS
❌ Escrow Operations: NEEDS_CONTRACTS
```

Happy testing! 🎉