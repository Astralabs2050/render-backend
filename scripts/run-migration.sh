#!/bin/bash

# Run database migration to add designId to jobs table
echo "🔄 Running database migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    echo "Please set your database connection string and try again"
    exit 1
fi

# Run the migration
echo "📝 Adding designId column to jobs table..."
psql "$DATABASE_URL" -f scripts/add-design-id-to-jobs.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo "🎯 Jobs table now has designId column for linking to NFT designs"
else
    echo "❌ Migration failed!"
    exit 1
fi
