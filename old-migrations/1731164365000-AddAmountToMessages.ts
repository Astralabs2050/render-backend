import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAmountToMessages1731164365000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add amount column to messages table
    await queryRunner.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10, 2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove amount column
    await queryRunner.query(`
      ALTER TABLE messages
      DROP COLUMN IF EXISTS "amount";
    `);
  }
}
