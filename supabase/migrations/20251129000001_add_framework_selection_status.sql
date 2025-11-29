-- Migration: Add selection_status and display_order to organization_frameworks
-- Purpose: Support "active" vs "evaluating" framework states for organizations
-- Date: 2025-11-29

-- Add selection_status column with CHECK constraint
ALTER TABLE organization_frameworks
ADD COLUMN IF NOT EXISTS selection_status TEXT NOT NULL DEFAULT 'active'
CHECK (selection_status IN ('active', 'evaluating'));

-- Add display_order for manual sorting within status groups
ALTER TABLE organization_frameworks
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_org_frameworks_selection_order
ON organization_frameworks(organization_id, selection_status, display_order);

-- Comments for documentation
COMMENT ON COLUMN organization_frameworks.selection_status IS
  'Framework activation status: active (fully selected) or evaluating (under consideration)';
COMMENT ON COLUMN organization_frameworks.display_order IS
  'Manual ordering within status groups, lower numbers appear first';

-- Update existing rows to have sequential display_order based on created_at
WITH ordered_frameworks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY created_at
    ) - 1 as new_order
  FROM organization_frameworks
)
UPDATE organization_frameworks
SET display_order = ordered_frameworks.new_order
FROM ordered_frameworks
WHERE organization_frameworks.id = ordered_frameworks.id;
