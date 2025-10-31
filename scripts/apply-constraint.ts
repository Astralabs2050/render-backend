import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyConstraint() {
  console.log('🔧 Applying NFT constraint migration...\n');

  // Create a data source
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.SUPABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Initialize connection
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✓ Connected\n');

    // Step 1: Check for violations
    console.log('🔍 Step 1: Checking for violations...');
    const violations = await dataSource.query(`
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
      console.log(`⚠️  Found ${violations.length} NFT(s) with invalid state:\n`);
      violations.forEach((nft: any) => {
        console.log(`   - ID: ${nft.id}`);
        console.log(`     Name: ${nft.name}`);
        console.log(`     Status: ${nft.status}`);
        console.log(`     MintedAt: ${nft.mintedAt}`);
        console.log(`     TxHash: ${nft.transactionHash}\n`);
      });

      // Step 2: Clean up violations
      console.log('🧹 Step 2: Cleaning up invalid NFTs...');
      const result = await dataSource.query(`
        UPDATE nfts
        SET
          status = 'draft',
          "mintedAt" = NULL
        WHERE status IN ('minted', 'listed', 'hired', 'sold')
          AND "transactionHash" IS NULL
      `);
      console.log(`✓ Reset ${violations.length} NFT(s) to draft status\n`);
    } else {
      console.log('✓ No violations found\n');
    }

    // Step 3: Check if constraint already exists
    console.log('🔍 Step 3: Checking if constraint already exists...');
    const existingConstraint = await dataSource.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'nft_minted_requires_tx_hash'
    `);

    if (existingConstraint.length > 0) {
      console.log('ℹ️  Constraint already exists, skipping creation\n');
    } else {
      // Step 4: Add the constraint
      console.log('➕ Step 4: Adding constraint...');
      await dataSource.query(`
        ALTER TABLE nfts
        ADD CONSTRAINT nft_minted_requires_tx_hash
        CHECK (
          (status IN ('minted', 'listed', 'hired', 'sold') AND "transactionHash" IS NOT NULL)
          OR
          (status NOT IN ('minted', 'listed', 'hired', 'sold'))
        )
      `);
      console.log('✓ Constraint added successfully\n');
    }

    // Step 5: Verify
    console.log('✅ Step 5: Verifying constraint...');
    const constraint = await dataSource.query(`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conname = 'nft_minted_requires_tx_hash'
    `);

    if (constraint.length > 0) {
      console.log('✓ Constraint verified:\n');
      console.log(`   ${constraint[0].constraint_definition}\n`);
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   - All minted/listed NFTs now require a transaction hash');
    console.log('   - Invalid NFTs have been reset to draft status');
    console.log('   - Database will reject any attempts to save inconsistent data\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the migration
applyConstraint();
