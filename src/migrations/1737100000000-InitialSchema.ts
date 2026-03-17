import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1737100000000 implements MigrationInterface {
    name = 'InitialSchema1737100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM types
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "user_type_enum" AS ENUM('creator', 'maker');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "job_status_enum" AS ENUM('open', 'in_progress', 'completed', 'cancelled', 'disputed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "job_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "application_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "nft_status_enum" AS ENUM('draft', 'minting', 'minted', 'published', 'listed', 'hired', 'sold');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "escrow_status_enum" AS ENUM('created', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "milestone_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'approved', 'disputed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "ai_milestone_status_enum" AS ENUM('pending', 'unlocked', 'completed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "chat_state_enum" AS ENUM('welcome', 'intent', 'info_gather', 'design_preview', 'design_approved', 'job_info_gather', 'payment_required', 'listed', 'maker_proposal', 'escrow_payment', 'fabric_shipping', 'sample_review', 'final_review', 'delivery', 'completed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "message_type_enum" AS ENUM('text', 'image', 'file', 'system', 'delivery_and_measurements', 'applicationAccepted', 'design_inquiry');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "delivery_status_enum" AS ENUM('pending', 'shipped', 'delivered', 'canceled');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "transaction_type_enum" AS ENUM('purchase', 'usage', 'refund', 'bonus', 'admin_adjustment');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "ai_action_type_enum" AS ENUM('design_generation', 'design_variation', 'design_refinement', 'metadata_extraction');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "notification_type_enum" AS ENUM('message', 'job_alert', 'job_application', 'job_accepted', 'job_completed', 'credits_low', 'credits_finished', 'credit_purchase', 'escrow_funded', 'escrow_released', 'system');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "notification_priority_enum" AS ENUM('low', 'normal', 'high', 'critical');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "qr_code_type_enum" AS ENUM('product', 'verification', 'tracking');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "email" varchar NOT NULL UNIQUE,
                "password" varchar,
                "fullName" varchar,
                "verified" boolean DEFAULT false,
                "otp" varchar,
                "otpCreatedAt" timestamp,
                "userType" user_type_enum,
                "walletAddress" varchar,
                "walletPrivateKey" varchar,
                "location" varchar,
                "category" varchar,
                "skills" text,
                "profileCompleted" boolean DEFAULT false,
                "governmentIdImages" text,
                "nameOnId" varchar,
                "idCountryOfIssue" varchar,
                "idExpiryDate" timestamp,
                "businessCertificateImage" varchar,
                "businessName" varchar,
                "businessCountryOfRegistration" varchar,
                "businessType" varchar,
                "taxRegistrationNumber" varchar,
                "identityVerified" boolean DEFAULT false,
                "workExperience" jsonb,
                "projects" jsonb,
                "brandName" varchar,
                "brandOrigin" varchar,
                "brandStory" varchar,
                "brandLogo" varchar,
                "profilePicture" varchar,
                "bio" text,
                "creditBalance" integer DEFAULT 0,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);

        // Create waitlist table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "waitlist" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "fullName" varchar NOT NULL,
                "email" varchar NOT NULL UNIQUE,
                "phoneNumber" varchar,
                "what_you_make" varchar,
                "website" varchar,
                "location" varchar,
                "approved" boolean DEFAULT false,
                "invited" boolean DEFAULT false,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);

        // Create oauth_providers table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "oauth_providers" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "provider" varchar NOT NULL,
                "providerId" varchar NOT NULL,
                "profile" jsonb,
                "accessToken" varchar,
                "refreshToken" varchar,
                "userId" uuid NOT NULL,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_oauth_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create jobs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "jobs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "title" varchar NOT NULL,
                "description" text NOT NULL,
                "requirements" text,
                "budget" decimal(10,2) NOT NULL,
                "currency" varchar DEFAULT 'USD',
                "status" job_status_enum DEFAULT 'open',
                "priority" job_priority_enum DEFAULT 'medium',
                "deadline" timestamp,
                "tags" text,
                "referenceImages" text,
                "chatId" varchar,
                "designId" uuid,
                "creatorId" uuid NOT NULL,
                "makerId" uuid,
                "acceptedAt" timestamp,
                "completedAt" timestamp,
                "escrowContractAddress" varchar,
                "deliverables" text,
                "feedback" text,
                "rating" integer,
                "aiPrompt" text,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_job_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id"),
                CONSTRAINT "fk_job_maker" FOREIGN KEY ("makerId") REFERENCES "users"("id")
            )
        `);

        // Create job_applications table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "job_applications" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "job_id" uuid NOT NULL,
                "maker_id" uuid NOT NULL,
                "proposal" text,
                "coverLetter" text,
                "proposedBudget" decimal(10,2) NOT NULL,
                "estimatedDays" integer,
                "proposedTimeline" integer,
                "portfolioLinks" text,
                "portfolioUrl" varchar,
                "selectedProjects" jsonb,
                "status" application_status_enum DEFAULT 'pending',
                "message" text,
                "respondedAt" timestamp,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_application_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id"),
                CONSTRAINT "fk_application_maker" FOREIGN KEY ("maker_id") REFERENCES "users"("id")
            )
        `);

        // Create saved_jobs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "saved_jobs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "job_id" uuid NOT NULL,
                "maker_id" uuid NOT NULL,
                "saved_at" timestamp DEFAULT now(),
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_saved_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id"),
                CONSTRAINT "fk_saved_maker" FOREIGN KEY ("maker_id") REFERENCES "users"("id")
            )
        `);

        // Create ai_chats table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_chats" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "title" varchar NOT NULL,
                "state" chat_state_enum DEFAULT 'welcome',
                "metadata" jsonb,
                "userId" uuid NOT NULL,
                "creatorId" uuid,
                "makerId" uuid,
                "designPreviews" text,
                "jobId" varchar,
                "escrowId" varchar,
                "nftId" varchar,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_ai_chat_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_ai_chat_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_ai_chat_maker" FOREIGN KEY ("makerId") REFERENCES "users"("id")
            )
        `);

        // Create ai_chat_messages table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "content" text NOT NULL,
                "role" varchar NOT NULL,
                "metadata" jsonb,
                "chatId" uuid NOT NULL,
                "imageUrl" varchar,
                "actionType" varchar,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_ai_message_chat" FOREIGN KEY ("chatId") REFERENCES "ai_chats"("id") ON DELETE CASCADE
            )
        `);

        // Create ai_milestones table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_milestones" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                "amount" decimal(10,2) NOT NULL,
                "percentage" decimal(5,2) NOT NULL,
                "status" ai_milestone_status_enum DEFAULT 'pending',
                "completedAt" timestamp,
                "dueDate" timestamp,
                "chatId" uuid NOT NULL,
                "order" integer NOT NULL,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_ai_milestone_chat" FOREIGN KEY ("chatId") REFERENCES "ai_chats"("id") ON DELETE CASCADE
            )
        `);

        // Create nfts table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "nfts" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "category" varchar NOT NULL,
                "price" decimal(10,2) NOT NULL,
                "quantity" integer NOT NULL,
                "designLink" varchar,
                "deadline" timestamp,
                "status" nft_status_enum DEFAULT 'draft',
                "tokenId" varchar,
                "contractAddress" varchar,
                "ipfsHash" varchar,
                "ipfsUrl" varchar,
                "imageUrl" varchar,
                "metadata" jsonb,
                "attributes" jsonb,
                "creatorId" uuid NOT NULL,
                "chatId" uuid,
                "transactionHash" varchar,
                "mintedAt" timestamp,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_nft_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_nft_chat" FOREIGN KEY ("chatId") REFERENCES "ai_chats"("id")
            )
        `);

        // Create escrow_contracts table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "escrow_contracts" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "contractAddress" varchar NOT NULL,
                "totalAmount" decimal(18,8) NOT NULL,
                "status" escrow_status_enum DEFAULT 'created',
                "creatorId" uuid NOT NULL,
                "makerId" uuid NOT NULL,
                "nftId" uuid,
                "chatId" uuid,
                "transactionHash" varchar,
                "fundedAt" timestamp,
                "completedAt" timestamp,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_escrow_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_escrow_maker" FOREIGN KEY ("makerId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_escrow_nft" FOREIGN KEY ("nftId") REFERENCES "nfts"("id"),
                CONSTRAINT "fk_escrow_chat" FOREIGN KEY ("chatId") REFERENCES "ai_chats"("id")
            )
        `);

        // Create escrow_milestones table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "escrow_milestones" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "percentage" decimal(5,2) NOT NULL,
                "amount" decimal(18,8) NOT NULL,
                "order" integer NOT NULL,
                "status" milestone_status_enum DEFAULT 'pending',
                "escrowId" uuid NOT NULL,
                "dueDate" timestamp,
                "completedAt" timestamp,
                "approvedAt" timestamp,
                "transactionHash" varchar,
                "metadata" jsonb,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_milestone_escrow" FOREIGN KEY ("escrowId") REFERENCES "escrow_contracts"("id") ON DELETE CASCADE
            )
        `);

        // Create chats table (marketplace)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "chats" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "jobId" uuid,
                "creatorId" uuid NOT NULL,
                "makerId" uuid NOT NULL,
                "designId" varchar,
                "lastMessageAt" timestamp,
                "isActive" boolean DEFAULT true,
                "escrowId" varchar,
                "escrowContractAddress" varchar,
                "escrowTokenId" varchar,
                "escrowStatus" varchar DEFAULT 'none',
                "escrowAmount" decimal(10,2),
                "releasedAmount" decimal(10,2) DEFAULT 0,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_chat_job" FOREIGN KEY ("jobId") REFERENCES "jobs"("id"),
                CONSTRAINT "fk_chat_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id"),
                CONSTRAINT "fk_chat_maker" FOREIGN KEY ("makerId") REFERENCES "users"("id")
            )
        `);

        // Create messages table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "messages" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "chatId" uuid NOT NULL,
                "senderId" uuid NOT NULL,
                "content" text,
                "type" message_type_enum DEFAULT 'text',
                "attachments" text,
                "isRead" boolean DEFAULT false,
                "actionType" varchar,
                "price" decimal(10,2),
                "amount" decimal(10,2),
                "applicationData" jsonb,
                "designId" varchar,
                "title" varchar,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_message_chat" FOREIGN KEY ("chatId") REFERENCES "chats"("id"),
                CONSTRAINT "fk_message_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id")
            )
        `);

        // Create marketplace_delivery_details table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "marketplace_delivery_details" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "chatId" uuid NOT NULL,
                "country" varchar NOT NULL,
                "name" varchar NOT NULL,
                "phone" varchar NOT NULL,
                "address" text NOT NULL,
                "status" delivery_status_enum DEFAULT 'pending',
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_delivery_chat" FOREIGN KEY ("chatId") REFERENCES "chats"("id")
            )
        `);

        // Create marketplace_measurements table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "marketplace_measurements" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "chatId" uuid NOT NULL,
                "neck" decimal(5,2) NOT NULL,
                "chest" decimal(5,2) NOT NULL,
                "armLeft" decimal(5,2) NOT NULL,
                "armRight" decimal(5,2) NOT NULL,
                "waist" decimal(5,2) NOT NULL,
                "weight" decimal(5,2) NOT NULL,
                "hips" decimal(5,2) NOT NULL,
                "legs" decimal(5,2) NOT NULL,
                "thighLeft" decimal(5,2) NOT NULL,
                "thighRight" decimal(5,2) NOT NULL,
                "calfLeft" decimal(5,2) NOT NULL,
                "calfRight" decimal(5,2) NOT NULL,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_measurements_chat" FOREIGN KEY ("chatId") REFERENCES "chats"("id")
            )
        `);

        // Create user_delivery_details table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_delivery_details" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "country" varchar NOT NULL,
                "name" varchar NOT NULL,
                "phone" varchar NOT NULL,
                "address" text NOT NULL,
                "status" delivery_status_enum DEFAULT 'pending',
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_user_delivery_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
            )
        `);

        // Create user_measurements table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_measurements" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "neck" decimal(5,2) NOT NULL,
                "chest" decimal(5,2) NOT NULL,
                "armLeft" decimal(5,2) NOT NULL,
                "armRight" decimal(5,2) NOT NULL,
                "waist" decimal(5,2) NOT NULL,
                "weight" decimal(5,2) NOT NULL,
                "hips" decimal(5,2) NOT NULL,
                "legs" decimal(5,2) NOT NULL,
                "thighLeft" decimal(5,2) NOT NULL,
                "thighRight" decimal(5,2) NOT NULL,
                "calfLeft" decimal(5,2) NOT NULL,
                "calfRight" decimal(5,2) NOT NULL,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_user_measurements_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
            )
        `);

        // Create credit_transactions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "credit_transactions" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" transaction_type_enum NOT NULL,
                "amount" integer NOT NULL,
                "balanceBefore" integer NOT NULL,
                "balanceAfter" integer NOT NULL,
                "description" varchar,
                "paymentReference" varchar UNIQUE,
                "aiActionType" ai_action_type_enum,
                "chatId" varchar,
                "metadata" jsonb,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_transaction_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
            )
        `);

        // Create notifications table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "notifications" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "type" notification_type_enum NOT NULL,
                "title" varchar NOT NULL,
                "message" text NOT NULL,
                "priority" notification_priority_enum DEFAULT 'normal',
                "isRead" boolean DEFAULT false,
                "actionUrl" varchar,
                "metadata" jsonb,
                "emailSent" boolean DEFAULT false,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_notification_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
            )
        `);

        // Create qr_codes table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "qr_codes" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "hash" varchar NOT NULL,
                "url" varchar NOT NULL,
                "imageUrl" varchar,
                "type" qr_code_type_enum DEFAULT 'product',
                "nftId" uuid NOT NULL,
                "createdBy" uuid NOT NULL,
                "metadata" jsonb,
                "expiresAt" timestamp,
                "isActive" boolean DEFAULT true,
                "scanCount" integer DEFAULT 0,
                "lastScannedAt" timestamp,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now(),
                CONSTRAINT "fk_qr_nft" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_qr_creator" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create designs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "designs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "creatorId" uuid NOT NULL,
                "name" varchar NOT NULL,
                "price" decimal(15,2) NOT NULL,
                "amountOfPieces" integer NOT NULL,
                "location" varchar NOT NULL,
                "deadline" varchar NOT NULL,
                "designImages" text[] NOT NULL,
                "status" varchar DEFAULT 'pending_payment',
                "paymentTransactionHash" varchar,
                "blockchainMetadata" jsonb,
                "paidAt" timestamp,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);

        // Create payment_intents table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payment_intents" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "collectionId" uuid NOT NULL,
                "status" varchar DEFAULT 'pending',
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp
            )
        `);

        // Create reconciliation_jobs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reconciliation_jobs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "collectionId" uuid NOT NULL,
                "transactionHash" varchar NOT NULL,
                "amount" decimal(15,2) NOT NULL,
                "status" varchar DEFAULT 'pending',
                "createdAt" timestamp DEFAULT now(),
                "processedAt" timestamp
            )
        `);

        // Create vr_emails table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "vr_emails" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "email" varchar NOT NULL UNIQUE,
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_credit_transactions_user_created" ON "credit_transactions"("userId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_credit_transactions_payment_ref" ON "credit_transactions"("paymentReference")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_created" ON "notifications"("userId", "isRead", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_user_created" ON "notifications"("userId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payment_intents_user_collection" ON "payment_intents"("userId", "collectionId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_chats_creator" ON "chats"("creatorId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_chats_maker" ON "chats"("makerId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_chats_job" ON "chats"("jobId")`);

        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order (respecting foreign key constraints)
        await queryRunner.query(`DROP TABLE IF EXISTS "vr_emails" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reconciliation_jobs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payment_intents" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "designs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "qr_codes" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "credit_transactions" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_measurements" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_delivery_details" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "marketplace_measurements" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "marketplace_delivery_details" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "messages" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "chats" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "escrow_milestones" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "escrow_contracts" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "nfts" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_milestones" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_messages" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_chats" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "saved_jobs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "job_applications" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "jobs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "oauth_providers" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "waitlist" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

        // Drop ENUM types
        await queryRunner.query(`DROP TYPE IF EXISTS "qr_code_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_priority_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ai_action_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "transaction_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "delivery_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "message_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "chat_state_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ai_milestone_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "milestone_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "escrow_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "nft_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "application_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "job_priority_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "job_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_type_enum"`);
    }
}
