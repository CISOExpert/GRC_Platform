-- Add hierarchy fields to external_controls for proper framework structure
-- This allows each framework to maintain its native hierarchy (Function→Category→Control, Domain→Control, etc.)

-- Add hierarchy columns
ALTER TABLE external_controls 
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES external_controls(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS hierarchy_level text, -- 'function', 'category', 'control', 'subcontrol', etc.
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false; -- true for grouping nodes (Function, Category, Domain)

-- Add index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_external_controls_parent ON external_controls(parent_id);
CREATE INDEX IF NOT EXISTS idx_external_controls_framework_parent ON external_controls(framework_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_external_controls_hierarchy_level ON external_controls(hierarchy_level);

-- Add the same hierarchy support to scf_controls for consistency
ALTER TABLE scf_controls
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES scf_controls(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS hierarchy_level text, -- 'domain', 'control', 'subcontrol'
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_scf_controls_parent ON scf_controls(parent_id);
CREATE INDEX IF NOT EXISTS idx_scf_controls_domain_parent ON scf_controls(domain, parent_id);

-- Comments
COMMENT ON COLUMN external_controls.parent_id IS 'Parent control in hierarchy - NULL for top-level items';
COMMENT ON COLUMN external_controls.hierarchy_level IS 'Level type: function, category, control, subcontrol, etc.';
COMMENT ON COLUMN external_controls.is_group IS 'True for non-leaf nodes (categories, functions, domains)';
COMMENT ON COLUMN external_controls.display_order IS 'Sort order within parent for UI display';

COMMENT ON COLUMN scf_controls.parent_id IS 'Parent control in hierarchy - NULL for domain-level items';
COMMENT ON COLUMN scf_controls.hierarchy_level IS 'Level type: domain, control, subcontrol';
