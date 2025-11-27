-- Migration: Set parent-child relationships for SCF controls
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-27
--
-- This migration:
-- 1. Sets parent_id for SCF sub-controls (e.g., GOV-01.1 -> GOV-01)
-- 2. Creates proper hierarchy for navigation and display
--
-- See docs/unified-framework-mapping-migration.md for full plan

DO $$
DECLARE
  scf_framework_id uuid;
  updated_count integer;
BEGIN
  -- Get SCF framework ID
  SELECT id INTO scf_framework_id FROM frameworks WHERE code = 'SCF';

  IF scf_framework_id IS NULL THEN
    RAISE EXCEPTION 'SCF framework not found';
  END IF;

  -- Update parent_id for SCF sub-controls
  -- Pattern: GOV-01.1 should have parent GOV-01
  UPDATE external_controls child
  SET parent_id = parent.id
  FROM external_controls parent
  WHERE child.framework_id = scf_framework_id
    AND parent.framework_id = scf_framework_id
    AND child.ref_code ~ '^[A-Z]+-\d+\.\d+'                           -- Child pattern: XXX-00.0
    AND parent.ref_code = regexp_replace(child.ref_code, '\.\d+$', '') -- Parent pattern: XXX-00
    AND child.parent_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Set parent_id for % SCF sub-controls', updated_count;

  -- Verify hierarchy
  RAISE NOTICE 'Hierarchy verification:';
  RAISE NOTICE '  - Controls with parents: %', (
    SELECT COUNT(*) FROM external_controls
    WHERE framework_id = scf_framework_id AND parent_id IS NOT NULL
  );
  RAISE NOTICE '  - Top-level controls (no parent): %', (
    SELECT COUNT(*) FROM external_controls
    WHERE framework_id = scf_framework_id AND parent_id IS NULL
  );
END $$;
