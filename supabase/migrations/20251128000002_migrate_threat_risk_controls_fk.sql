-- Migration: Update threat_controls and risk_controls FKs to reference external_controls
-- Part of: Unified Framework Mapping Migration
-- Date: 2025-11-28
--
-- This migration updates the foreign key references in threat_controls and risk_controls
-- to point to external_controls instead of the deprecated scf_controls table.
--
-- The SCF controls now live in external_controls with framework_id pointing to SCF framework.

-- Step 1: Drop existing foreign key constraints
ALTER TABLE threat_controls
DROP CONSTRAINT IF EXISTS threat_controls_control_id_fkey;

ALTER TABLE risk_controls
DROP CONSTRAINT IF EXISTS risk_controls_control_id_fkey;

-- Step 2: Add new foreign key constraints pointing to external_controls
ALTER TABLE threat_controls
ADD CONSTRAINT threat_controls_control_id_fkey
FOREIGN KEY (control_id) REFERENCES external_controls(id) ON DELETE CASCADE;

ALTER TABLE risk_controls
ADD CONSTRAINT risk_controls_control_id_fkey
FOREIGN KEY (control_id) REFERENCES external_controls(id) ON DELETE CASCADE;

-- Step 3: Update any existing data to point to external_controls
-- The SCF controls were migrated with the same UUIDs, so existing mappings should still work
-- But let's verify and log any orphaned records

DO $$
DECLARE
  orphaned_threat_controls integer;
  orphaned_risk_controls integer;
BEGIN
  -- Check for orphaned threat_controls (control_id not in external_controls)
  SELECT COUNT(*) INTO orphaned_threat_controls
  FROM threat_controls tc
  WHERE NOT EXISTS (
    SELECT 1 FROM external_controls ec WHERE ec.id = tc.control_id
  );

  -- Check for orphaned risk_controls
  SELECT COUNT(*) INTO orphaned_risk_controls
  FROM risk_controls rc
  WHERE NOT EXISTS (
    SELECT 1 FROM external_controls ec WHERE ec.id = rc.control_id
  );

  RAISE NOTICE '=== FK Migration Verification ===';
  RAISE NOTICE 'Orphaned threat_controls records: %', orphaned_threat_controls;
  RAISE NOTICE 'Orphaned risk_controls records: %', orphaned_risk_controls;

  IF orphaned_threat_controls > 0 THEN
    RAISE WARNING 'Found % orphaned threat_controls records - these will fail FK constraint', orphaned_threat_controls;
  END IF;

  IF orphaned_risk_controls > 0 THEN
    RAISE WARNING 'Found % orphaned risk_controls records - these will fail FK constraint', orphaned_risk_controls;
  END IF;
END $$;

-- Step 4: Add comments documenting the change
COMMENT ON CONSTRAINT threat_controls_control_id_fkey ON threat_controls IS
'References external_controls (unified controls table). Updated 2025-11-28 from deprecated scf_controls.';

COMMENT ON CONSTRAINT risk_controls_control_id_fkey ON risk_controls IS
'References external_controls (unified controls table). Updated 2025-11-28 from deprecated scf_controls.';

-- Step 5: Add indexes if not present (for query performance)
CREATE INDEX IF NOT EXISTS idx_threat_controls_control_id ON threat_controls(control_id);
CREATE INDEX IF NOT EXISTS idx_risk_controls_control_id ON risk_controls(control_id);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'threat_controls.control_id now references external_controls(id)';
  RAISE NOTICE 'risk_controls.control_id now references external_controls(id)';
END $$;
