-- Migration: Deprecate legacy SCF-specific tables
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-27
--
-- This migration adds deprecation notices to legacy tables.
-- Tables are NOT dropped - they remain for backwards compatibility.
--
-- Deprecated tables:
-- - scf_controls: Use external_controls with SCF framework_id
-- - scf_control_mappings: Use framework_crosswalks with mapping_origin
--
-- See docs/unified-framework-mapping-migration.md for full plan

-- Add deprecation notice to scf_controls
COMMENT ON TABLE scf_controls IS
'DEPRECATED (2025-11-27): This table is deprecated. Use external_controls with framework_id pointing to SCF framework.

Migration: SCF controls have been copied to external_controls where they can be queried alongside other framework controls.

Query pattern:
  SELECT * FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = ''SCF'';

This table is kept for backwards compatibility and historical reference.
It will be removed in a future release after all references are updated.';

-- Add deprecation notice to scf_control_mappings
COMMENT ON TABLE scf_control_mappings IS
'DEPRECATED (2025-11-27): This table is deprecated. Use framework_crosswalks with mapping_origin field.

Migration: All mappings have been copied to framework_crosswalks with mapping_origin = ''SCF''.

Query pattern:
  SELECT * FROM framework_crosswalks
  WHERE mapping_origin = ''SCF'';

The new framework_crosswalks table supports:
- Any-to-any framework mappings (not just SCF-centric)
- Multiple mapping origins (SCF, NIST, ISO, custom)
- Direct control ID references for performance

This table is kept for backwards compatibility and historical reference.
It will be removed in a future release after all references are updated.';

-- Log the deprecation
DO $$
BEGIN
  RAISE NOTICE '=== Legacy Table Deprecation ===';
  RAISE NOTICE '';
  RAISE NOTICE 'The following tables have been marked as DEPRECATED:';
  RAISE NOTICE '  - scf_controls';
  RAISE NOTICE '  - scf_control_mappings';
  RAISE NOTICE '';
  RAISE NOTICE 'Use these unified tables instead:';
  RAISE NOTICE '  - external_controls (all controls including SCF)';
  RAISE NOTICE '  - framework_crosswalks (all mappings with origin tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'See docs/unified-framework-mapping-migration.md for details.';
END $$;
