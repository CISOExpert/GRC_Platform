-- Migration: Add columns to framework_crosswalks for unified mapping support
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-27
--
-- This migration adds:
-- 1. mapping_origin - tracks which source document defined the mapping (SCF, NIST, ISO, custom)
-- 2. mapping_strength - strength of mapping (exact, partial, related)
-- 3. source_control_id - direct FK to external_controls for source control
-- 4. target_control_id - direct FK to external_controls for target control
--
-- See docs/unified-framework-mapping-migration.md for full plan

-- Add mapping_origin column
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS mapping_origin text DEFAULT 'SCF';

-- Add mapping_strength column (exists in scf_control_mappings but not here)
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS mapping_strength text;

-- Add source_control_id for direct FK relationship (improves query performance)
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS source_control_id uuid REFERENCES external_controls(id) ON DELETE CASCADE;

-- Add target_control_id for direct FK relationship (improves query performance)
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS target_control_id uuid REFERENCES external_controls(id) ON DELETE CASCADE;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_crosswalks_mapping_origin
ON framework_crosswalks(mapping_origin);

CREATE INDEX IF NOT EXISTS idx_crosswalks_source_control
ON framework_crosswalks(source_control_id);

CREATE INDEX IF NOT EXISTS idx_crosswalks_target_control
ON framework_crosswalks(target_control_id);

CREATE INDEX IF NOT EXISTS idx_crosswalks_mapping_strength
ON framework_crosswalks(mapping_strength);

-- Add comments documenting the columns
COMMENT ON COLUMN framework_crosswalks.mapping_origin IS
'Origin of this mapping: SCF, NIST, ISO, custom, etc. Indicates which source document defined this relationship.';

COMMENT ON COLUMN framework_crosswalks.mapping_strength IS
'Strength of mapping: exact (full alignment), partial (some overlap), related (conceptually similar)';

COMMENT ON COLUMN framework_crosswalks.source_control_id IS
'Direct FK to external_controls for the source control. Optional but improves query performance.';

COMMENT ON COLUMN framework_crosswalks.target_control_id IS
'Direct FK to external_controls for the target control. Optional but improves query performance.';

-- Update table comment
COMMENT ON TABLE framework_crosswalks IS
'Unified framework-to-framework control mappings. Supports any-to-any framework comparisons with origin tracking. Replaces scf_control_mappings.';
