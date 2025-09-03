-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    maker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, maker_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_jobs_maker_id ON saved_jobs(maker_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_saved_at ON saved_jobs(saved_at);

-- Add comments
COMMENT ON TABLE saved_jobs IS 'Jobs saved by makers for later reference';
COMMENT ON COLUMN saved_jobs.job_id IS 'Reference to the job being saved';
COMMENT ON COLUMN saved_jobs.maker_id IS 'Reference to the maker who saved the job';
COMMENT ON COLUMN saved_jobs.saved_at IS 'When the job was saved';
