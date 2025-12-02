-- Fix get_frameworks_with_counts to properly count SCF mappings
--
-- For SCF: count mappings FROM SCF (source)
-- For other frameworks: count mappings TO framework FROM SCF (target)

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
  ),
  framework_stats AS (
    SELECT
      f.id,
      f.code,
      f.name,
      f.version,
      f.description,
      COUNT(DISTINCT ec.id) as external_control_count,
      -- For SCF: count mappings FROM SCF (as source)
      -- For others: count mappings TO this framework FROM SCF
      CASE
        WHEN f.code = 'SCF' THEN (
          SELECT COUNT(DISTINCT fc2.id)
          FROM framework_crosswalks fc2
          WHERE fc2.source_framework_id = f.id
        )
        ELSE (
          SELECT COUNT(DISTINCT fc2.id)
          FROM framework_crosswalks fc2
          WHERE fc2.target_framework_id = f.id
            AND fc2.source_framework_id = (SELECT id FROM scf_framework)
        )
      END as mapping_count
    FROM frameworks f
    LEFT JOIN external_controls ec ON ec.framework_id = f.id
    GROUP BY f.id, f.code, f.name, f.version, f.description
  )
  SELECT
    fs.id,
    fs.code,
    fs.name,
    fs.version,
    fs.description,
    fs.external_control_count,
    fs.mapping_count
  FROM framework_stats fs
  -- Only include frameworks that have either controls OR mappings (or are SCF)
  WHERE fs.external_control_count > 0 OR fs.mapping_count > 0 OR fs.code = 'SCF'
  ORDER BY fs.name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_frameworks_with_counts() TO anon;

-- Add comment documenting the change
COMMENT ON FUNCTION get_frameworks_with_counts() IS
'Returns all frameworks with their external control count and SCF mapping count.
For SCF: mapping_count = total mappings FROM SCF to other frameworks.
For others: mapping_count = total mappings TO this framework FROM SCF.
Uses framework_crosswalks (unified model) for mapping counts.
Filters out frameworks with no controls and no mappings (except SCF).';
