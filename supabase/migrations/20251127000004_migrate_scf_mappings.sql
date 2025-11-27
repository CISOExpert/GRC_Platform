-- Migration: Migrate mappings from scf_control_mappings to framework_crosswalks
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-27
--
-- This migration:
-- 1. Copies all mappings from scf_control_mappings to framework_crosswalks
-- 2. Sets mapping_origin = 'SCF' for all migrated mappings
-- 3. Links source_control_id and target_control_id for performance
--
-- Direction: SCF (source) -> External Framework (target)
--
-- See docs/unified-framework-mapping-migration.md for full plan

DO $$
DECLARE
  scf_framework_id uuid;
  migrated_count integer;
  existing_count integer;
BEGIN
  -- Get SCF framework ID
  SELECT id INTO scf_framework_id FROM frameworks WHERE code = 'SCF';

  IF scf_framework_id IS NULL THEN
    RAISE EXCEPTION 'SCF framework not found in frameworks table';
  END IF;

  RAISE NOTICE 'SCF Framework ID: %', scf_framework_id;

  -- Check if mappings already exist in framework_crosswalks
  SELECT COUNT(*) INTO existing_count
  FROM framework_crosswalks fc
  WHERE fc.mapping_origin = 'SCF';

  IF existing_count > 0 THEN
    RAISE NOTICE 'Found % existing SCF mappings in framework_crosswalks. Skipping migration.', existing_count;
    RETURN;
  END IF;

  -- Migrate scf_control_mappings -> framework_crosswalks
  INSERT INTO framework_crosswalks (
    source_framework_id,
    source_ref,
    source_control_id,
    target_framework_id,
    target_ref,
    target_control_id,
    mapping_origin,
    mapping_strength,
    confidence,
    notes,
    created_at
  )
  SELECT
    scf_framework_id,                    -- source = SCF framework
    sc.control_id,                       -- source_ref = SCF control ID (e.g., GOV-01)
    m.scf_control_id,                    -- source_control_id (UUID - now points to external_controls too)
    m.framework_id,                      -- target = external framework
    ec.ref_code,                         -- target_ref = external control ref code
    m.external_control_id,               -- target_control_id (UUID)
    'SCF',                               -- mapping_origin = 'SCF' (these came from SCF spreadsheet)
    m.mapping_strength,                  -- exact, partial, related
    m.confidence,                        -- 0-100
    m.notes,
    m.created_at
  FROM scf_control_mappings m
  JOIN scf_controls sc ON m.scf_control_id = sc.id
  JOIN external_controls ec ON m.external_control_id = ec.id
  ON CONFLICT (source_framework_id, source_ref, target_framework_id, target_ref)
  DO UPDATE SET
    mapping_strength = EXCLUDED.mapping_strength,
    confidence = EXCLUDED.confidence,
    notes = EXCLUDED.notes,
    source_control_id = EXCLUDED.source_control_id,
    target_control_id = EXCLUDED.target_control_id;

  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % mappings to framework_crosswalks', migrated_count;

  -- Show sample of migrated data
  RAISE NOTICE 'Sample migrated mappings:';
  PERFORM (
    SELECT string_agg(
      format('  %s -> %s (%s)', fc.source_ref, fc.target_ref, tf.code),
      E'\n'
    )
    FROM framework_crosswalks fc
    JOIN frameworks tf ON fc.target_framework_id = tf.id
    WHERE fc.mapping_origin = 'SCF'
    LIMIT 5
  );
END $$;
