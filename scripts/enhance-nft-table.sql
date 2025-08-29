-- Migration: Enhance NFT table for new design workflow
-- This adds missing fields needed for the marketplace cards and design approval flow

-- Add new status value to NFTStatus enum
ALTER TYPE nft_status ADD VALUE IF NOT EXISTS 'published';

-- Add new columns to NFTs table
ALTER TABLE nfts ADD COLUMN IF NOT EXISTS "designLink" VARCHAR(500);
ALTER TABLE nfts ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nfts_status ON nfts(status);
CREATE INDEX IF NOT EXISTS idx_nfts_creator_status ON nfts("creatorId", status);
CREATE INDEX IF NOT EXISTS idx_nfts_deadline ON nfts(deadline);

-- Update existing NFTs to have default values
UPDATE nfts SET "designLink" = CONCAT('/designs/', id) WHERE "designLink" IS NULL;
UPDATE nfts SET deadline = "createdAt" + INTERVAL '30 days' WHERE deadline IS NULL;

-- Add comment to explain the new workflow
COMMENT ON COLUMN nfts.status IS 'Design status: draft -> published -> listed -> sold';
COMMENT ON COLUMN nfts."designLink" IS 'Link to view design details';
COMMENT ON COLUMN nfts.deadline IS 'Production deadline for the design';
