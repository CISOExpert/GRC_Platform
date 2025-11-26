-- Create function to get frameworks with control and mapping counts
-- This provides real-time counts via aggregation without denormalization

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
  LEFT JOIN scf_control_mappings scm ON scm.external_control_id = ec.id
  GROUP BY f.id, f.code, f.name, f.version, f.description
  ORDER BY f.name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO anon;
