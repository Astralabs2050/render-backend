import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeDesignIdToUuid1703000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change designId column type from varchar to uuid
    // First, we need to handle any existing data that might not be valid UUIDs
    await queryRunner.query(`
      ALTER TABLE jobs
      ALTER COLUMN "designId" TYPE uuid USING
      CASE
        WHEN "designId" IS NULL THEN NULL
        WHEN "designId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "designId"::uuid
        ELSE NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to varchar
    await queryRunner.query(`
      ALTER TABLE jobs
      ALTER COLUMN "designId" TYPE varchar
      USING "designId"::varchar
    `);
  }
}
