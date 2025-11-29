-- Migration: Add title column and set proper display order for framework domains
-- Date: 2025-11-27
--
-- This migration:
-- 1. Adds 'title' column to external_controls for display names
-- 2. Sets proper display_order and titles for NIST CSF 2.0 domains
-- 3. Framework domain order follows official NIST CSF 2.0 structure

-- ============================================================================
-- 1. Add title column to external_controls
-- ============================================================================

ALTER TABLE external_controls
ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN external_controls.title IS 'Display name/title for the control (e.g., "Identify" for ref_code "ID")';

-- ============================================================================
-- 2. Update NIST CSF 2.0 domain titles and display_order
-- ============================================================================
-- Official NIST CSF 2.0 order: Govern, Identify, Protect, Detect, Respond, Recover

DO $$
DECLARE
  nist_csf_id uuid;
BEGIN
  -- Find NIST CSF framework (may have multiple versions, get the one with controls)
  SELECT f.id INTO nist_csf_id
  FROM frameworks f
  WHERE f.code = 'NIST-CSF'
  AND EXISTS (SELECT 1 FROM external_controls ec WHERE ec.framework_id = f.id)
  LIMIT 1;

  IF nist_csf_id IS NULL THEN
    RAISE NOTICE 'NIST-CSF framework not found or has no controls. Skipping.';
    RETURN;
  END IF;

  RAISE NOTICE 'Updating NIST CSF framework ID: %', nist_csf_id;

  -- Update GOVERN (GV)
  UPDATE external_controls
  SET title = 'Govern', display_order = 1
  WHERE framework_id = nist_csf_id AND ref_code = 'GV';

  -- Update IDENTIFY (ID)
  UPDATE external_controls
  SET title = 'Identify', display_order = 2
  WHERE framework_id = nist_csf_id AND ref_code = 'ID';

  -- Update PROTECT (PR)
  UPDATE external_controls
  SET title = 'Protect', display_order = 3
  WHERE framework_id = nist_csf_id AND ref_code = 'PR';

  -- Update DETECT (DE)
  UPDATE external_controls
  SET title = 'Detect', display_order = 4
  WHERE framework_id = nist_csf_id AND ref_code = 'DE';

  -- Update RESPOND (RS)
  UPDATE external_controls
  SET title = 'Respond', display_order = 5
  WHERE framework_id = nist_csf_id AND ref_code = 'RS';

  -- Update RECOVER (RC)
  UPDATE external_controls
  SET title = 'Recover', display_order = 6
  WHERE framework_id = nist_csf_id AND ref_code = 'RC';

  -- Mark top-level domains as groups
  UPDATE external_controls
  SET is_group = true
  WHERE framework_id = nist_csf_id
    AND ref_code IN ('GV', 'ID', 'PR', 'DE', 'RS', 'RC');

  RAISE NOTICE 'Updated NIST CSF 2.0 domain titles and display_order';

  -- Show results
  RAISE NOTICE 'Updated domains:';
  PERFORM (
    SELECT string_agg(
      format('  %s: %s (order: %s)', ref_code, title, display_order),
      E'\n'
    )
    FROM external_controls
    WHERE framework_id = nist_csf_id
      AND ref_code IN ('GV', 'ID', 'PR', 'DE', 'RS', 'RC')
    ORDER BY display_order
  );
END $$;

-- ============================================================================
-- 3. Update subdomain display_order based on ref_code pattern
-- ============================================================================
-- For subdomains like GV.OC, ID.AM, PR.AC, set order based on parent + suffix

DO $$
DECLARE
  nist_csf_id uuid;
  domain_record record;
  subdomain_record record;
  subdomain_order integer;
BEGIN
  -- Find NIST CSF framework
  SELECT f.id INTO nist_csf_id
  FROM frameworks f
  WHERE f.code = 'NIST-CSF'
  AND EXISTS (SELECT 1 FROM external_controls ec WHERE ec.framework_id = f.id)
  LIMIT 1;

  IF nist_csf_id IS NULL THEN
    RETURN;
  END IF;

  -- For each top-level domain, order its subdomains
  FOR domain_record IN
    SELECT id, ref_code, display_order as parent_order
    FROM external_controls
    WHERE framework_id = nist_csf_id
      AND ref_code IN ('GV', 'ID', 'PR', 'DE', 'RS', 'RC')
    ORDER BY display_order
  LOOP
    subdomain_order := 1;

    -- Update subdomains for this domain
    FOR subdomain_record IN
      SELECT id, ref_code
      FROM external_controls
      WHERE framework_id = nist_csf_id
        AND parent_id = domain_record.id
      ORDER BY ref_code
    LOOP
      UPDATE external_controls
      SET display_order = (domain_record.parent_order * 100) + subdomain_order
      WHERE id = subdomain_record.id;

      subdomain_order := subdomain_order + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Updated subdomain display_order values';
END $$;

-- ============================================================================
-- 4. Create index on display_order for sorting performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_external_controls_display_order
ON external_controls(framework_id, display_order);

-- ============================================================================
-- 5. Update the description field to be more useful (optional cleanup)
-- ============================================================================
-- Set description to title where description is generic placeholder

UPDATE external_controls
SET description = title
WHERE title IS NOT NULL
  AND description LIKE 'External control%';

-- Migration complete: external_controls now has title column and proper display_order
