-- Add parent_id_source field to external_controls to track how parent_id was set
ALTER TABLE external_controls
ADD COLUMN IF NOT EXISTS parent_id_source VARCHAR(32) DEFAULT NULL;

-- Optionally, add a comment for clarity
COMMENT ON COLUMN external_controls.parent_id_source IS 'Indicates if parent_id was set automatically (auto) or manually (manual/framework)';
