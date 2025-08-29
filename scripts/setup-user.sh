#!/bin/bash

# Setup User as Creator Script
# This script sets up the existing user as a creator with dummy NFT designs

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up user as creator...${NC}"
echo "=============================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL environment variable not set${NC}"
    echo "Please set your database connection string:"
    echo "export DATABASE_URL='postgresql://username:password@localhost:5432/database_name'"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql command not found${NC}"
    echo "Please install PostgreSQL client tools:"
    echo "- macOS: brew install postgresql"
    echo "- Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo -e "${BLUE}📊 Connecting to database...${NC}"

# Test database connection
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${YELLOW}❌ Failed to connect to database${NC}"
    echo "Please check your DATABASE_URL and ensure the database is accessible"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Step 1: Check current user status
echo -e "\n${BLUE}👤 Step 1: Checking current user status...${NC}"
psql "$DATABASE_URL" -f scripts/check-user.sql

# Step 2: Setup user as creator with dummy data
echo -e "\n${BLUE}🎨 Step 2: Setting up user as creator with dummy NFT designs...${NC}"
psql "$DATABASE_URL" -f scripts/setup-user-as-creator.sql

echo -e "\n${GREEN}🎉 Setup completed!${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Sign in with:"
echo "   Email: kases14120@discrip.com"
echo "   Password: Password123!"
echo ""
echo "2. Get JWT token from your auth endpoint"
echo ""
echo "3. Test the inventory endpoint:"
echo "   GET /creator/inventory"
echo ""
echo "4. Expected results:"
echo "   - 5 NFT designs with real image URLs"
echo "   - Various categories: Dress, Coat, T-Shirt, Gown, Jacket"
echo "   - Different statuses: listed, minted, draft"
echo ""
echo -e "${GREEN}✨ Ready to test!${NC}"

