-- Update function to get frameworks with control and mapping counts
-- Filter out frameworks that have neither controls nor mappings (except SCF)

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
  SELECT 
    f.id,
    f.code,
    f.name,
    f.version,
    f.description,
    COUNT(DISTINCT ec.id) as external_control_count,
    COUNT(DISTINCT scm.id) as mapping_count
  FROM frameworks f
  LEFT JOIN external_controls ec ON ec.framework_id = f.id
  LEFT JOIN scf_control_mappings scm ON scm.framework_id = f.id
  GROUP BY f.id, f.code, f.name, f.version, f.description
  -- Only include frameworks that have either controls OR mappings (or are SCF)
  HAVING COUNT(DISTINCT ec.id) > 0 OR COUNT(DISTINCT scm.id) > 0 OR f.code = 'SCF'
  ORDER BY f.name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO anon;
