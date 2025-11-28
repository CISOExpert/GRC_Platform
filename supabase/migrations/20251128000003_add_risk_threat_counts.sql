-- Migration: Add risk_count and threat_count to external_controls
-- Purpose: Pre-computed counts for inline badges in framework-info page
-- Updated during data imports (< annually)
-- Date: 2025-11-28

-- Add count columns
ALTER TABLE external_controls
ADD COLUMN IF NOT EXISTS risk_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS threat_count integer DEFAULT 0;

-- Add indexes for filtering/sorting by counts
CREATE INDEX IF NOT EXISTS idx_external_controls_risk_count
ON external_controls(risk_count) WHERE risk_count > 0;

CREATE INDEX IF NOT EXISTS idx_external_controls_threat_count
ON external_controls(threat_count) WHERE threat_count > 0;

-- Add comments
COMMENT ON COLUMN external_controls.risk_count IS
'Pre-computed count of risks linked to this control via risk_controls. Updated during data imports.';

COMMENT ON COLUMN external_controls.threat_count IS
'Pre-computed count of threats linked to this control via threat_controls. Updated during data imports.';

-- Populate counts for existing data
-- This updates SCF controls (which are the source of risk/threat mappings)
UPDATE external_controls ec
SET risk_count = (
  SELECT COUNT(DISTINCT rc.risk_id)
  FROM risk_controls rc
  WHERE rc.control_id = ec.id
);

UPDATE external_controls ec
SET threat_count = (
  SELECT COUNT(DISTINCT tc.threat_id)
  FROM threat_controls tc
  WHERE tc.control_id = ec.id
);

-- Log results
DO $$
DECLARE
  controls_with_risks integer;
  controls_with_threats integer;
  max_risks integer;
  max_threats integer;
BEGIN
  SELECT COUNT(*) INTO controls_with_risks FROM external_controls WHERE risk_count > 0;
  SELECT COUNT(*) INTO controls_with_threats FROM external_controls WHERE threat_count > 0;
  SELECT MAX(risk_count) INTO max_risks FROM external_controls;
  SELECT MAX(threat_count) INTO max_threats FROM external_controls;

  RAISE NOTICE '=== Risk/Threat Counts Migration ===';
  RAISE NOTICE 'Controls with risks: %', controls_with_risks;
  RAISE NOTICE 'Controls with threats: %', controls_with_threats;
  RAISE NOTICE 'Max risks on single control: %', max_risks;
  RAISE NOTICE 'Max threats on single control: %', max_threats;
END $$;
