-- Migration: Add framework_metadata table
-- Purpose: Store flexible supplementary data for framework hierarchies (domains, functions, controls)
-- Examples: SCF Principles/Intent, CIS IG levels, NIST Privacy function descriptions
-- Date: 2025-11-28

-- Create the framework_metadata table
CREATE TABLE IF NOT EXISTS framework_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
    reference_key TEXT NOT NULL,  -- e.g., "GOV", "ID-P", "1.1" - matches hierarchy ref_code
    metadata JSONB NOT NULL DEFAULT '{}',  -- Flexible storage for any framework-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique reference_key per framework
    UNIQUE(framework_id, reference_key)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_framework_metadata_framework_id ON framework_metadata(framework_id);
CREATE INDEX idx_framework_metadata_reference_key ON framework_metadata(reference_key);
CREATE INDEX idx_framework_metadata_gin ON framework_metadata USING GIN (metadata);

-- Add comments
COMMENT ON TABLE framework_metadata IS 'Flexible metadata storage for framework hierarchies. Stores supplementary data like SCF Principles, CIS IG levels, etc.';
COMMENT ON COLUMN framework_metadata.reference_key IS 'Matches the ref_code of a control or hierarchy level (e.g., "GOV" for SCF domain, "1.1" for CIS safeguard)';
COMMENT ON COLUMN framework_metadata.metadata IS 'JSONB storage for framework-specific fields. Structure varies by framework.';

-- Enable RLS
ALTER TABLE framework_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policy - allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read framework_metadata"
ON framework_metadata FOR SELECT
TO authenticated
USING (true);

-- RLS policy - allow anon users to read (for public API access)
CREATE POLICY "Allow anon users to read framework_metadata"
ON framework_metadata FOR SELECT
TO anon
USING (true);

-- Grant permissions
GRANT SELECT ON framework_metadata TO authenticated;
GRANT SELECT ON framework_metadata TO anon;
