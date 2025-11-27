-- Migration: Migrate SCF controls from scf_controls to external_controls
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-27
--
-- This migration:
-- 1. Copies all SCF controls from scf_controls to external_controls
-- 2. Links them to the SCF framework
-- 3. Preserves the original UUID for FK compatibility
-- 4. Stores SCF-specific fields in metadata JSON
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
    RAISE EXCEPTION 'SCF framework not found in frameworks table. Please ensure SCF exists in frameworks.';
  END IF;

  RAISE NOTICE 'SCF Framework ID: %', scf_framework_id;

  -- Check if SCF controls already exist in external_controls
  SELECT COUNT(*) INTO existing_count
  FROM external_controls ec
  WHERE ec.framework_id = scf_framework_id;

  IF existing_count > 0 THEN
    RAISE NOTICE 'Found % existing SCF controls in external_controls. Skipping migration.', existing_count;
    RETURN;
  END IF;

  -- Insert SCF controls into external_controls
  INSERT INTO external_controls (
    id,
    framework_id,
    ref_code,
    description,
    metadata,
    created_at,
    hierarchy_level,
    is_group,
    display_order
  )
  SELECT
    sc.id,                                  -- Keep same UUID for FK compatibility
    scf_framework_id,                       -- Link to SCF framework
    sc.control_id,                          -- ref_code = control_id (e.g., GOV-01)
    COALESCE(sc.title, sc.description, sc.control_id), -- Use title as description
    jsonb_build_object(
      'domain', sc.domain,
      'title', sc.title,
      'full_description', sc.description,
      'weight', sc.weight,
      'is_material_control', sc.is_material_control,
      'is_mcr', sc.is_mcr,
      'is_dsr', sc.is_dsr,
      'applicability_people', sc.applicability_people,
      'applicability_processes', sc.applicability_processes,
      'applicability_technology', sc.applicability_technology,
      'applicability_data', sc.applicability_data,
      'applicability_facilities', sc.applicability_facilities,
      'scf_version', sc.scf_version,
      'original_metadata', sc.metadata,
      'migrated_from', 'scf_controls',
      'migration_date', NOW()
    ) as metadata,
    sc.created_at,
    CASE
      WHEN sc.control_id ~ '^[A-Z]+-\d+\.\d+' THEN 'control'      -- Sub-control like GOV-01.1
      WHEN sc.control_id ~ '^[A-Z]+-\d+$' THEN 'subcategory'       -- Parent like GOV-01
      ELSE 'category'                                              -- Domain level
    END as hierarchy_level,
    CASE
      WHEN sc.control_id ~ '^[A-Z]+-\d+$' THEN true               -- Parents are groups
      ELSE false
    END as is_group,
    ROW_NUMBER() OVER (ORDER BY sc.control_id) as display_order
  FROM scf_controls sc
  ON CONFLICT (framework_id, ref_code) DO NOTHING;

  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % SCF controls to external_controls', migrated_count;
END $$;
