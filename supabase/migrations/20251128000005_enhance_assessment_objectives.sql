-- Migration: Enhance assessment_objectives table for SCF Assessment Objectives import
-- Adds columns to match SCF Excel structure:
--   - ao_id: Unique SCF AO identifier (e.g., AAT-01_A01)
--   - origin: Source of the assessment objective (SCF Created, NIST, etc.)
--   - notes: Errata/notes from SCF
--   - asset_type: Examine/interview/test classification
--   - assessment_procedure: How to perform the assessment
-- Framework mappings stored in metadata JSONB: {"frameworks": ["SCF_BASELINE", "NIST_800_53_R5", ...]}

-- Add ao_id column (unique identifier for each assessment objective)
ALTER TABLE assessment_objectives
ADD COLUMN IF NOT EXISTS ao_id TEXT;

-- Add origin column (where the AO came from)
ALTER TABLE assessment_objectives
ADD COLUMN IF NOT EXISTS origin TEXT;

-- Add notes column (errata/notes)
ALTER TABLE assessment_objectives
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add asset_type column (examine/interview/test)
ALTER TABLE assessment_objectives
ADD COLUMN IF NOT EXISTS asset_type TEXT;

-- Add assessment_procedure column (how to assess)
ALTER TABLE assessment_objectives
ADD COLUMN IF NOT EXISTS assessment_procedure TEXT;

-- Create unique index on ao_id (will be populated during import)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_objectives_ao_id
ON assessment_objectives(ao_id)
WHERE ao_id IS NOT NULL;

-- Create index on origin for filtering
CREATE INDEX IF NOT EXISTS idx_assessment_objectives_origin
ON assessment_objectives(origin);

-- Create GIN index on metadata for JSONB queries (framework filtering)
CREATE INDEX IF NOT EXISTS idx_assessment_objectives_metadata
ON assessment_objectives USING GIN(metadata);

-- Add comments for documentation
COMMENT ON COLUMN assessment_objectives.ao_id IS
'Unique SCF Assessment Objective ID (e.g., AAT-01_A01)';

COMMENT ON COLUMN assessment_objectives.origin IS
'Origin/source of the assessment objective (e.g., SCF Created, 53A_R5_SA-08_ODP[01])';

COMMENT ON COLUMN assessment_objectives.notes IS
'Notes and errata from SCF';

COMMENT ON COLUMN assessment_objectives.asset_type IS
'Asset type for assessment: examine, interview, test, or combination';

COMMENT ON COLUMN assessment_objectives.assessment_procedure IS
'Detailed procedure for performing the assessment';

COMMENT ON COLUMN assessment_objectives.metadata IS
'JSONB metadata including frameworks array: {"frameworks": ["SCF_BASELINE", "NIST_800_53_R5", ...]}';
