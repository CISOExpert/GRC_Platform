-- Migration: Verify unified framework mapping migration
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-27
--
-- This script verifies:
-- 1. SCF controls count matches between old and new tables
-- 2. Mapping count matches between old and new tables
-- 3. FK relationships are valid
-- 4. Sample data looks correct
--
-- See docs/unified-framework-mapping-migration.md for full plan

DO $$
DECLARE
  scf_in_external integer;
  scf_original integer;
  crosswalks_count integer;
  mappings_original integer;
  orphan_mappings integer;
  sample_mapping record;
BEGIN
  RAISE NOTICE '=== Unified Framework Migration Verification ===';
  RAISE NOTICE '';

  -- 1. Verify SCF controls migration
  SELECT COUNT(*) INTO scf_in_external
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'SCF';

  SELECT COUNT(*) INTO scf_original FROM scf_controls;

  RAISE NOTICE '1. SCF Controls Migration:';
  RAISE NOTICE '   - Original scf_controls: %', scf_original;
  RAISE NOTICE '   - Migrated to external_controls: %', scf_in_external;

  IF scf_in_external = scf_original THEN
    RAISE NOTICE '   - Status: PASS (counts match)';
  ELSE
    RAISE WARNING '   - Status: FAIL (count mismatch!)';
  END IF;
  RAISE NOTICE '';

  -- 2. Verify mappings migration
  SELECT COUNT(*) INTO crosswalks_count
  FROM framework_crosswalks
  WHERE mapping_origin = 'SCF';

  SELECT COUNT(*) INTO mappings_original FROM scf_control_mappings;

  RAISE NOTICE '2. Mappings Migration:';
  RAISE NOTICE '   - Original scf_control_mappings: %', mappings_original;
  RAISE NOTICE '   - Migrated to framework_crosswalks: %', crosswalks_count;

  IF crosswalks_count = mappings_original THEN
    RAISE NOTICE '   - Status: PASS (counts match)';
  ELSE
    RAISE WARNING '   - Status: FAIL (count mismatch!)';
  END IF;
  RAISE NOTICE '';

  -- 3. Verify FK relationships
  SELECT COUNT(*) INTO orphan_mappings
  FROM framework_crosswalks fc
  WHERE fc.source_control_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM external_controls ec WHERE ec.id = fc.source_control_id
    );

  RAISE NOTICE '3. FK Relationship Integrity:';
  RAISE NOTICE '   - Orphan source_control_id references: %', orphan_mappings;

  IF orphan_mappings = 0 THEN
    RAISE NOTICE '   - Status: PASS (no orphans)';
  ELSE
    RAISE WARNING '   - Status: FAIL (orphan references found!)';
  END IF;
  RAISE NOTICE '';

  -- 4. Sample data verification
  RAISE NOTICE '4. Sample Migrated Data:';

  FOR sample_mapping IN
    SELECT
      sf.code as source_fw,
      fc.source_ref,
      tf.code as target_fw,
      fc.target_ref,
      fc.mapping_strength,
      fc.mapping_origin
    FROM framework_crosswalks fc
    JOIN frameworks sf ON fc.source_framework_id = sf.id
    JOIN frameworks tf ON fc.target_framework_id = tf.id
    WHERE fc.mapping_origin = 'SCF'
    LIMIT 5
  LOOP
    RAISE NOTICE '   - % % -> % % (%, origin: %)',
      sample_mapping.source_fw,
      sample_mapping.source_ref,
      sample_mapping.target_fw,
      sample_mapping.target_ref,
      sample_mapping.mapping_strength,
      sample_mapping.mapping_origin;
  END LOOP;
  RAISE NOTICE '';

  -- 5. Total external_controls count
  RAISE NOTICE '5. Total External Controls:';
  RAISE NOTICE '   - Before migration: 12962 (external frameworks only)';
  RAISE NOTICE '   - After migration: % (includes SCF)', (SELECT COUNT(*) FROM external_controls);
  RAISE NOTICE '';

  -- 6. Framework distribution
  RAISE NOTICE '6. Top 10 Frameworks by Mapping Count:';
  FOR sample_mapping IN
    SELECT
      tf.code as fw_code,
      COUNT(*) as mapping_count
    FROM framework_crosswalks fc
    JOIN frameworks tf ON fc.target_framework_id = tf.id
    WHERE fc.mapping_origin = 'SCF'
    GROUP BY tf.code
    ORDER BY mapping_count DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '   - %: % mappings', sample_mapping.fw_code, sample_mapping.mapping_count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Verification Complete ===';
END $$;
