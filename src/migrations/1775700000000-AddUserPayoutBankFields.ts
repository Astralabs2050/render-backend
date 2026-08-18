import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPayoutBankFields1775700000000 implements MigrationInterface {
  name = 'AddUserPayoutBankFields1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "bankName" varchar,
      ADD COLUMN IF NOT EXISTS "accountNumber" varchar,
      ADD COLUMN IF NOT EXISTS "accountName" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "bankName",
      DROP COLUMN IF EXISTS "accountNumber",
      DROP COLUMN IF EXISTS "accountName"
    `);
  }
}
