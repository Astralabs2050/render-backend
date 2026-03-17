import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNFTMintConstraint1730362800000 implements MigrationInterface {
  name = 'AddNFTMintConstraint1730362800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Log existing violations
    const violations = await queryRunner.query(`
      SELECT
        id,
        name,
        status,
        "transactionHash",
        "mintedAt"
      FROM nfts
      WHERE status IN ('minted', 'listed', 'hired', 'sold')
        AND "transactionHash" IS NULL
    `);

    if (violations.length > 0) {
      console.log(`Found ${violations.length} NFTs with invalid state (minted/listed without transaction hash):`);
      violations.forEach((nft: any) => {
        console.log(`  - ID: ${nft.id}, Name: ${nft.name}, Status: ${nft.status}`);
      });

      // Step 2: Reset invalid NFTs to draft status
      console.log('Resetting invalid NFTs to draft status...');
      await queryRunner.query(`
        UPDATE nfts
        SET
          status = 'draft',
          "mintedAt" = NULL
        WHERE status IN ('minted', 'listed', 'hired', 'sold')
          AND "transactionHash" IS NULL
      `);
      console.log('✓ Invalid NFTs reset to draft');
    } else {
      console.log('✓ No invalid NFTs found');
    }

    // Step 3: Add the constraint
    console.log('Adding database constraint...');
    await queryRunner.query(`
      ALTER TABLE nfts
      ADD CONSTRAINT nft_minted_requires_tx_hash
      CHECK (
        (status IN ('minted', 'listed', 'hired', 'sold') AND "transactionHash" IS NOT NULL)
        OR
        (status NOT IN ('minted', 'listed', 'hired', 'sold'))
      )
    `);
    console.log('✓ Constraint added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the constraint if rolling back
    console.log('Removing NFT mint constraint...');
    await queryRunner.query(`
      ALTER TABLE nfts
      DROP CONSTRAINT IF EXISTS nft_minted_requires_tx_hash
    `);
    console.log('✓ Constraint removed');
  }
}
