import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEscrowTokenId1703000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add escrowTokenId column to chats table
    await queryRunner.query(`
      ALTER TABLE chats
      ADD COLUMN IF NOT EXISTS "escrowTokenId" VARCHAR(255);
    `);

    // Add index for faster lookups by tokenId
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_chats_escrow_token_id
      ON chats("escrowTokenId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_chats_escrow_token_id;
    `);

    // Remove escrowTokenId column
    await queryRunner.query(`
      ALTER TABLE chats
      DROP COLUMN IF EXISTS "escrowTokenId";
    `);
  }
}