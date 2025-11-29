-- Migration: Create function to get organization's frameworks with proper ordering
-- Purpose: Returns active frameworks first (by display_order), then evaluating
-- Includes framework details and control counts for dashboard stats
-- Date: 2025-11-29

CREATE OR REPLACE FUNCTION get_organization_frameworks_prioritized(org_uuid UUID)
RETURNS TABLE (
  id UUID,
  framework_id UUID,
  selection_status TEXT,
  is_primary BOOLEAN,
  compliance_status TEXT,
  display_order INTEGER,
  target_completion_date DATE,
  notes TEXT,
  -- Framework details
  framework_code TEXT,
  framework_name TEXT,
  framework_version TEXT,
  framework_description TEXT,
  -- Counts for dashboard
  external_control_count BIGINT,
  mapping_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    of.id,
    of.framework_id,
    of.selection_status,
    of.is_primary,
    of.compliance_status,
    of.display_order,
    of.target_completion_date,
    of.notes,
    -- Framework details
    f.code as framework_code,
    f.name as framework_name,
    f.version as framework_version,
    f.description as framework_description,
    -- Control counts
    COALESCE(fc.control_count, 0)::BIGINT as external_control_count,
    COALESCE(mc.mapping_count, 0)::BIGINT as mapping_count
  FROM organization_frameworks of
  JOIN frameworks f ON of.framework_id = f.id
  -- Get control counts from a subquery for performance
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT as control_count
    FROM external_controls ec
    WHERE ec.framework_id = f.id
  ) fc ON true
  -- Get mapping counts from a subquery for performance
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT as mapping_count
    FROM scf_control_mappings scm
    JOIN external_controls ec ON scm.external_control_id = ec.id
    WHERE ec.framework_id = f.id
  ) mc ON true
  WHERE of.organization_id = org_uuid
  ORDER BY
    CASE WHEN of.selection_status = 'active' THEN 0 ELSE 1 END,
    of.display_order,
    f.name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_frameworks_prioritized(UUID) TO authenticated;

-- Also create a helper function to get available frameworks for adding
-- (frameworks not yet added to an organization)
CREATE OR REPLACE FUNCTION get_available_frameworks_for_org(org_uuid UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  version TEXT,
  description TEXT,
  external_control_count BIGINT,
  mapping_count BIGINT,
  is_selected BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    f.id,
    f.code,
    f.name,
    f.version,
    f.description,
    COALESCE(fc.control_count, 0)::BIGINT as external_control_count,
    COALESCE(mc.mapping_count, 0)::BIGINT as mapping_count,
    of.id IS NOT NULL as is_selected
  FROM frameworks f
  -- Get control counts
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT as control_count
    FROM external_controls ec
    WHERE ec.framework_id = f.id
  ) fc ON true
  -- Get mapping counts
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT as mapping_count
    FROM scf_control_mappings scm
    JOIN external_controls ec ON scm.external_control_id = ec.id
    WHERE ec.framework_id = f.id
  ) mc ON true
  -- Check if already selected
  LEFT JOIN organization_frameworks of ON of.framework_id = f.id
    AND of.organization_id = org_uuid
  -- Only show frameworks with controls (exclude empty frameworks)
  WHERE COALESCE(fc.control_count, 0) > 0
  ORDER BY
    of.id IS NOT NULL DESC,  -- Selected first
    f.name;
$$;

GRANT EXECUTE ON FUNCTION get_available_frameworks_for_org(UUID) TO authenticated;
