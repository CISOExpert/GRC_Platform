-- Fix get_frameworks_with_counts to use framework_crosswalks (unified model)
-- instead of deprecated scf_control_mappings table
--
-- The mapping_count should reflect mappings FROM SCF TO this framework
-- in the framework_crosswalks table

CREATE OR REPLACE FUNCTION get_frameworks_with_counts()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  version text,
  description text,
  external_control_count bigint,
  mapping_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH scf_framework AS (
    SELECT id FROM frameworks WHERE code = 'SCF' LIMIT 1
  )
  SELECT
    f.id,
    f.code,
    f.name,
    f.version,
    f.description,
    COUNT(DISTINCT ec.id) as external_control_count,
    -- Count mappings FROM SCF TO this framework in framework_crosswalks
    COUNT(DISTINCT fc.id) as mapping_count
  FROM frameworks f
  LEFT JOIN external_controls ec ON ec.framework_id = f.id
  -- Join to framework_crosswalks where SCF is source and this framework is target
  LEFT JOIN framework_crosswalks fc ON fc.target_framework_id = f.id
    AND fc.source_framework_id = (SELECT id FROM scf_framework)
  GROUP BY f.id, f.code, f.name, f.version, f.description
  -- Only include frameworks that have either controls OR mappings (or are SCF)
  HAVING COUNT(DISTINCT ec.id) > 0 OR COUNT(DISTINCT fc.id) > 0 OR f.code = 'SCF'
  ORDER BY f.name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO anon;

-- Add comment documenting the change
COMMENT ON FUNCTION get_frameworks_with_counts() IS
'Returns all frameworks with their external control count and SCF mapping count.
Uses framework_crosswalks (unified model) for mapping counts.
Filters out frameworks with no controls and no mappings (except SCF).';
