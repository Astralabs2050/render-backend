import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatorProfileFields1775800000000 implements MigrationInterface {
  name = 'AddCreatorProfileFields1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "measurement" varchar,
      ADD COLUMN IF NOT EXISTS "outfitGender" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "measurement",
      DROP COLUMN IF EXISTS "outfitGender"
    `);
  }
}
