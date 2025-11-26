-- Enable ltree for hierarchical control structures
CREATE EXTENSION IF NOT EXISTS ltree;

-- Add path column to scf_controls for hierarchy queries
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS path ltree;

-- Index for fast hierarchical queries
CREATE INDEX IF NOT EXISTS scf_controls_path_idx ON scf_controls USING GIST (path);

-- Add path column to external_controls as well
ALTER TABLE external_controls ADD COLUMN IF NOT EXISTS path ltree;
CREATE INDEX IF NOT EXISTS external_controls_path_idx ON external_controls USING GIST (path);

COMMENT ON COLUMN scf_controls.path IS 'Hierarchical path for control (e.g., GOV.01, SEC.ACC.01)';
COMMENT ON COLUMN external_controls.path IS 'Hierarchical path for external framework control';
