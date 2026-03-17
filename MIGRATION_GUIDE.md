# Database Migration Guide

## Overview

This guide explains how to set up and run database migrations for the Astra Fashion Platform backend. Since you've created a new database, you'll need to run the initial migration to create all tables.

## What's Included

The migration system includes:

### 📁 Migration Files
- **`src/migrations/1737100000000-InitialSchema.ts`** - Complete database schema with all 24 tables

### 🛠️ Scripts
- **`scripts/run-migrations.ts`** - Run pending migrations
- **`scripts/revert-migration.ts`** - Revert the last migration
- **`scripts/show-migrations.ts`** - Show migration status

### ⚙️ Configuration
- **`src/config/typeorm.config.ts`** - TypeORM DataSource configuration
- **`src/config/database.module.ts`** - Updated to use migrations (synchronize: false)

## Database Tables Created

The initial migration creates these tables:

### Core Tables
1. **users** - User accounts (creators & makers)
2. **waitlist** - Waitlist registrations
3. **oauth_providers** - OAuth authentication data

### Marketplace Tables
4. **jobs** - Job postings
5. **job_applications** - Job applications from makers
6. **saved_jobs** - Saved jobs by makers
7. **chats** - Marketplace chat conversations
8. **messages** - Chat messages

### AI Chat Tables
9. **ai_chats** - AI-powered design chats
10. **ai_chat_messages** - AI chat messages
11. **ai_milestones** - AI chat milestones

### Web3/NFT Tables
12. **nfts** - NFT designs
13. **escrow_contracts** - Escrow contracts
14. **escrow_milestones** - Escrow payment milestones
15. **qr_codes** - QR codes for products

### Measurement & Delivery Tables
16. **marketplace_delivery_details** - Chat-specific delivery info
17. **marketplace_measurements** - Chat-specific measurements
18. **user_delivery_details** - User default delivery info
19. **user_measurements** - User default measurements

### Payment & Credits Tables
20. **credit_transactions** - Credit purchase/usage history
21. **designs** - Design collections
22. **payment_intents** - Payment tracking
23. **reconciliation_jobs** - Blockchain reconciliation

### Other Tables
24. **notifications** - User notifications
25. **vr_emails** - VR email subscriptions

## Prerequisites

1. **New PostgreSQL Database** - You should have created a new database
2. **Environment Variables** - Set `DATABASE_URL` in your `.env` file

### Example DATABASE_URL Format

```bash
# Supabase
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Render PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/astra_db
```

## Step-by-Step Migration Process

### Step 1: Verify Database Connection

Make sure your `DATABASE_URL` is correctly set in `.env`:

```bash
# Check your environment
npm run env:check
```

### Step 2: Run the Initial Migration

This will create all tables in your new database:

```bash
npm run migration:run
```

**Expected Output:**
```
🔄 Initializing database connection...
✅ Database connection established
🔄 Running migrations...
✅ Successfully ran 1 migration(s):
   - InitialSchema1737100000000
✅ Migration completed successfully
```

### Step 3: Verify Migration Status

Check which migrations have been executed:

```bash
npm run migration:show
```

### Step 4: Start Your Application

Once migrations are complete, start your application:

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Migration Commands

### Run Pending Migrations
```bash
npm run migration:run
```
Executes all pending migrations in order.

### Revert Last Migration
```bash
npm run migration:revert
```
Rolls back the most recent migration. Use this if you need to undo changes.

### Show Migration Status
```bash
npm run migration:show
```
Displays all executed migrations with timestamps.

## Troubleshooting

### Error: "Tenant or user not found"

**Problem:** Database credentials are incorrect.

**Solution:**
1. Verify your `DATABASE_URL` in `.env`
2. Check username, password, host, and database name
3. For Supabase: Get the connection string from Settings → Database
4. For Render: Get the Internal Database URL from your database dashboard

### Error: "relation already exists"

**Problem:** Tables already exist in the database.

**Solution:**
1. If you want a fresh start, drop all tables manually or create a new database
2. Or skip the initial migration if tables are already created

### Error: "uuid-ossp extension does not exist"

**Problem:** PostgreSQL UUID extension is not enabled.

**Solution:**
The migration automatically creates this extension. If it fails, run manually:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Migration Fails Midway

**Problem:** Migration partially completed.

**Solution:**
1. Check the error message
2. Fix the issue (usually permissions or syntax)
3. Revert the migration: `npm run migration:revert`
4. Fix the migration file if needed
5. Run again: `npm run migration:run`

## Important Notes

### ⚠️ Synchronize is Disabled

The database configuration now has `synchronize: false`. This means:
- TypeORM will NOT automatically create/update tables
- You MUST use migrations for all schema changes
- This prevents accidental data loss in production

### 🔒 Production Safety

In production:
1. Always backup your database before running migrations
2. Test migrations in a staging environment first
3. Review migration SQL before executing
4. Keep migration files in version control

### 📝 Creating New Migrations

When you need to modify the database schema:

1. Create a new migration file:
```bash
npm run typeorm migration:create src/migrations/YourMigrationName
```

2. Edit the generated file with your changes
3. Run the migration: `npm run migration:run`

## Database Schema Overview

### Key Relationships

```
users
├── oauth_providers (1:many)
├── jobs (creator) (1:many)
├── jobs (maker) (1:many)
├── job_applications (1:many)
├── ai_chats (1:many)
├── nfts (1:many)
├── escrow_contracts (creator/maker) (1:many)
├── credit_transactions (1:many)
└── notifications (1:many)

jobs
├── job_applications (1:many)
├── saved_jobs (1:many)
└── chats (1:1)

ai_chats
├── ai_chat_messages (1:many)
├── ai_milestones (1:many)
└── nfts (1:many)

nfts
├── escrow_contracts (1:1)
└── qr_codes (1:many)

escrow_contracts
└── escrow_milestones (1:many)

chats (marketplace)
├── messages (1:many)
├── marketplace_delivery_details (1:many)
└── marketplace_measurements (1:many)
```

## Enum Types Created

The migration creates these PostgreSQL enum types:

- `user_type_enum`: creator, maker
- `job_status_enum`: open, in_progress, completed, cancelled, disputed
- `job_priority_enum`: low, medium, high, urgent
- `application_status_enum`: pending, accepted, rejected, withdrawn
- `nft_status_enum`: draft, minting, minted, published, listed, hired, sold
- `escrow_status_enum`: created, funded, in_progress, completed, disputed, cancelled
- `milestone_status_enum`: pending, in_progress, completed, approved, disputed
- `ai_milestone_status_enum`: pending, unlocked, completed
- `chat_state_enum`: welcome, intent, info_gather, design_preview, etc.
- `message_type_enum`: text, image, file, system, etc.
- `delivery_status_enum`: pending, shipped, delivered, canceled
- `transaction_type_enum`: purchase, usage, refund, bonus, admin_adjustment
- `ai_action_type_enum`: design_generation, design_variation, etc.
- `notification_type_enum`: message, job_alert, job_application, etc.
- `notification_priority_enum`: low, normal, high, critical
- `qr_code_type_enum`: product, verification, tracking

## Next Steps

After running migrations:

1. ✅ Verify all tables are created
2. ✅ Test database connectivity
3. ✅ Run your application
4. ✅ Test user registration and login
5. ✅ Verify all features work correctly

## Support

If you encounter issues:

1. Check the error logs
2. Verify your `DATABASE_URL` is correct
3. Ensure PostgreSQL version is 12+
4. Check database user has CREATE permissions
5. Review the migration file for any syntax errors

## Summary

You now have:
- ✅ Complete database schema migration
- ✅ All 24 tables created with proper relationships
- ✅ Enum types for data validation
- ✅ Indexes for performance
- ✅ Foreign key constraints for data integrity
- ✅ Migration management scripts

Your database is ready for use! 🎉
