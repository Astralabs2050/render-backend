-- Migration: Add designId column to jobs table
-- This links jobs to the NFT designs they're hiring makers for

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "designId" VARCHAR(255);

-- Add index for better performance when querying by designId
CREATE INDEX IF NOT EXISTS idx_jobs_design_id ON jobs("designId");

-- Update existing jobs that might have been created before this column was added
-- (This is optional and can be removed if not needed)
-- UPDATE jobs SET "designId" = NULL WHERE "designId" IS NULL;
