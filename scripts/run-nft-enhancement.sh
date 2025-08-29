#!/bin/bash

# Run database migration to enhance NFT table for new design workflow
echo "🔄 Running NFT table enhancement migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL environment variable not set"
    echo "Please set your database connection string and try again"
    exit 1
fi

# Run the migration
echo "📝 Enhancing NFT table with new fields..."
psql "$DATABASE_URL" -f scripts/enhance-nft-table.sql

if [ $? -eq 0 ]; then
    echo "NFT table enhancement completed successfully!"
    echo "New fields added: designLink, deadline, published status"
    echo "Design workflow now supports: DRAFT → PUBLISHED → MARKET"
else
    echo "Migration failed!"
    exit 1
fi
