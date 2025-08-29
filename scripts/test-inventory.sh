#!/bin/bash

# Test Inventory Endpoint Script
# This script tests the creator inventory endpoint after setup

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Creator Inventory Endpoint${NC}"
echo "=============================================="

# Check if server is running
echo -e "${BLUE}🔍 Checking if server is running...${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running on port 3000${NC}"
else
    echo -e "${RED}❌ Server is not running on port 3000${NC}"
    echo "Please start the server with: npm run start:dev"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Manual Testing Steps:${NC}"
echo "1. Sign in with your user:"
echo "   Email: kases14120@discrip.com"
echo "   Password: Password123!"
echo ""
echo "2. Get JWT token from your auth endpoint"
echo ""
echo "3. Test the inventory endpoint:"
echo "   GET http://localhost:3000/creator/inventory"
echo "   Headers: Authorization: Bearer YOUR_JWT_TOKEN"
echo ""
echo -e "${BLUE}🧪 Quick Test Commands:${NC}"
echo ""
echo "# Health check (no auth needed):"
echo "curl http://localhost:3000/health"
echo ""
echo "# Test inventory without auth (should return 401):"
echo "curl -X GET http://localhost:3000/creator/inventory"
echo ""
echo "# Test inventory with auth (replace YOUR_TOKEN):"
echo "curl -X GET http://localhost:3000/creator/inventory \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN'"
echo ""
echo -e "${BLUE}📊 Expected Results:${NC}"
echo "- Health check: Should return 200 OK"
echo "- Inventory without auth: Should return 401 Unauthorized"
echo "- Inventory with auth: Should return 200 OK with 5 NFT designs"
echo ""
echo -e "${GREEN}✨ Ready to test!${NC}"

