#!/bin/bash

# Test Hire Maker Endpoint Script
# This script tests the new hire maker endpoint

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Hire Maker Endpoint${NC}"
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
echo "1. Sign in with your creator user:"
echo "   Email: kases14120@discrip.com"
echo "   Password: Password123!"
echo ""
echo "2. Get JWT token from your auth endpoint"
echo ""
echo "3. Test the hire maker endpoint:"
echo "   POST http://localhost:3000/creator/hire-maker"
echo "   Headers: Authorization: Bearer YOUR_JWT_TOKEN"
echo "   Content-Type: application/json"
echo ""
echo -e "${BLUE}📝 Sample Request Body:${NC}"
cat << 'EOF'
{
  "designId": "YOUR_DESIGN_ID",
  "requirements": "Need a skilled maker to produce 10 pieces of this design with high quality materials",
  "quantity": 10,
  "deadlineDate": "2025-12-31",
  "productTimeline": "4-6 weeks",
  "budgetRange": "medium",
  "maxBudget": 2000,
  "shippingRegion": "United States",
  "fabricSource": "Premium cotton and silk blend",
  "skillKeywords": ["sewing", "pattern-making", "embroidery"],
  "experienceLevel": "advanced",
  "additionalNotes": "Please ensure all pieces meet quality standards",
  "preferredCommunication": "email"
}
EOF

echo ""
echo -e "${BLUE}🧪 Quick Test Commands:${NC}"
echo ""
echo "# Health check (no auth needed):"
echo "curl http://localhost:3000/health"
echo ""
echo "# Test hire maker without auth (should return 401):"
echo "curl -X POST http://localhost:3000/creator/hire-maker \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"designId\":\"test\"}'"
echo ""
echo "# Test hire maker with auth (replace YOUR_TOKEN and YOUR_DESIGN_ID):"
echo "curl -X POST http://localhost:3000/creator/hire-maker \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "  -d '{\"designId\":\"YOUR_DESIGN_ID\",\"requirements\":\"Test requirements\",\"quantity\":5,\"deadlineDate\":\"2025-12-31\",\"productTimeline\":\"2 weeks\",\"budgetRange\":\"medium\",\"shippingRegion\":\"US\",\"fabricSource\":\"Cotton\",\"skillKeywords\":[\"sewing\"],\"experienceLevel\":\"intermediate\"}'"
echo ""
echo -e "${BLUE}📊 Expected Results:${NC}"
echo "- Health check: Should return 200 OK"
echo "- Hire maker without auth: Should return 401 Unauthorized"
echo "- Hire maker with auth: Should return 200 OK with job details"
echo ""
echo -e "${BLUE}🔑 Getting Design ID:${NC}"
echo "Use the inventory endpoint to get your design ID:"
echo "GET /creator/inventory"
echo ""
echo -e "${GREEN}✨ Ready to test!${NC}"

