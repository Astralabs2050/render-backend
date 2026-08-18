import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAstraWalletTables1775600000000 implements MigrationInterface {
  name = 'CreateAstraWalletTables1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_wallets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL UNIQUE,
        "availableBalance" decimal(14,2) NOT NULL DEFAULT 0,
        "pendingWithdrawal" decimal(14,2) NOT NULL DEFAULT 0,
        "currency" varchar NOT NULL DEFAULT 'NGN'
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wallet_transactions_type_enum" AS ENUM ('credit','debit','hold','release','withdrawal');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "type" "wallet_transactions_type_enum" NOT NULL,
        "amount" decimal(14,2) NOT NULL,
        "balanceBefore" decimal(14,2) NOT NULL,
        "balanceAfter" decimal(14,2) NOT NULL,
        "description" text,
        "chatId" uuid,
        "escrowId" uuid,
        "paystackReference" varchar,
        "metadata" jsonb
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_user" ON "wallet_transactions" ("userId")`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_escrows_status_enum" AS ENUM ('pending','funded','partially_released','completed','cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_escrows_paymenttype_enum" AS ENUM ('one_time','milestone');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_escrows" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "chatId" uuid NOT NULL,
        "brandId" uuid NOT NULL,
        "makerId" uuid NOT NULL,
        "totalAmount" decimal(14,2) NOT NULL,
        "fundedAmount" decimal(14,2) NOT NULL DEFAULT 0,
        "releasedAmount" decimal(14,2) NOT NULL DEFAULT 0,
        "status" "project_escrows_status_enum" NOT NULL DEFAULT 'pending',
        "paymentType" "project_escrows_paymenttype_enum" NOT NULL DEFAULT 'milestone',
        "paystackReference" varchar,
        "currency" varchar NOT NULL DEFAULT 'NGN'
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_escrow_chat" ON "project_escrows" ("chatId")`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_escrow_milestones_status_enum" AS ENUM ('pending','released');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_escrow_milestones" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "escrowId" uuid NOT NULL REFERENCES "project_escrows"("id") ON DELETE CASCADE,
        "label" varchar NOT NULL,
        "orderIndex" int NOT NULL,
        "percent" decimal(5,2) NOT NULL,
        "amount" decimal(14,2) NOT NULL,
        "status" "project_escrow_milestones_status_enum" NOT NULL DEFAULT 'pending',
        "releasedAt" TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "withdrawal_requests_status_enum" AS ENUM ('pending','paid','rejected');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "amount" decimal(14,2) NOT NULL,
        "bankName" varchar NOT NULL,
        "accountNumber" varchar NOT NULL,
        "accountName" varchar NOT NULL,
        "status" "withdrawal_requests_status_enum" NOT NULL DEFAULT 'pending',
        "adminNote" text,
        "processedAt" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_withdrawal_user" ON "withdrawal_requests" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "withdrawal_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_escrow_milestones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_escrows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets"`);
  }
}
