-- ============================================================================
-- SCF Full Data Model Enhancements
-- Date: 2025-11-25
-- Purpose: Add support for SCF CORE baselines, MCR/DSR classifications,
--          threat-control linkages, SCRM tiers, and framework metadata
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Baseline types for SCF CORE
CREATE TYPE baseline_type AS ENUM (
  'community_derived',
  'fundamentals',
  'mad',              -- Mergers, Acquisitions & Divestitures
  'esp_l1',           -- ESP Level 1 Foundational
  'esp_l2',           -- ESP Level 2 Critical Infrastructure
  'esp_l3',           -- ESP Level 3 Advanced Threats
  'ai_enabled',       -- AI-Enabled Operations
  'ai_model'          -- AI Model Deployment
);

-- ============================================================================
-- 2. TABLE ENHANCEMENTS
-- ============================================================================

-- Add columns to scf_controls
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS scrm_tier1 BOOLEAN DEFAULT false;
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS scrm_tier2 BOOLEAN DEFAULT false;
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS scrm_tier3 BOOLEAN DEFAULT false;
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS errata_notes TEXT;

COMMENT ON COLUMN scf_controls.scrm_tier1 IS 'SCRM Focus - Tier 1 Strategic: Long-term supply chain risk governance';
COMMENT ON COLUMN scf_controls.scrm_tier2 IS 'SCRM Focus - Tier 2 Operational: Day-to-day vendor management';
COMMENT ON COLUMN scf_controls.scrm_tier3 IS 'SCRM Focus - Tier 3 Tactical: Hands-on technical SCRM controls';
COMMENT ON COLUMN scf_controls.errata_notes IS 'Corrections and updates from SCF 2025.3.1 errata';

-- Add columns to frameworks
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS geography TEXT;
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS source_organization TEXT;
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS mapping_column_header TEXT;

COMMENT ON COLUMN frameworks.geography IS 'Geographic scope: Universal, EMEA, Americas, APAC, etc.';
COMMENT ON COLUMN frameworks.source_organization IS 'Issuing body: NIST, ISO, AICPA, CIS, etc.';
COMMENT ON COLUMN frameworks.mapping_column_header IS 'Original column header from SCF Excel for matching';

-- Add columns to threats
ALTER TABLE threats ADD COLUMN IF NOT EXISTS threat_id TEXT UNIQUE;
ALTER TABLE threats ADD COLUMN IF NOT EXISTS threat_grouping TEXT;

COMMENT ON COLUMN threats.threat_id IS 'SCF threat identifier: NT-1, MT-2, FT-1, etc.';
COMMENT ON COLUMN threats.threat_grouping IS 'Threat category: Natural Threat, Man-Made Threat, etc.';

-- Add columns to risks
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_grouping TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS nist_csf_function TEXT;

COMMENT ON COLUMN risks.risk_grouping IS 'Risk category: Access Control, Asset Management, Business Continuity, etc.';
COMMENT ON COLUMN risks.nist_csf_function IS 'NIST CSF function: Identify, Protect, Detect, Respond, Recover';

-- ============================================================================
-- 3. NEW TABLES
-- ============================================================================

-- Control Baselines (SCF CORE membership)
CREATE TABLE IF NOT EXISTS control_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  baseline_type baseline_type NOT NULL,
  included BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, baseline_type)
);

CREATE INDEX IF NOT EXISTS idx_control_baselines_type ON control_baselines(baseline_type);
CREATE INDEX IF NOT EXISTS idx_control_baselines_control ON control_baselines(control_id);

COMMENT ON TABLE control_baselines IS 'SCF CORE baseline membership - which controls belong to Fundamentals, ESP levels, AI baselines, etc.';
COMMENT ON COLUMN control_baselines.baseline_type IS 'Which SCF CORE baseline this control belongs to';
COMMENT ON COLUMN control_baselines.included IS 'Whether control is included in this baseline';

-- Control Classifications (MCR/DSR/MSR per organization)
CREATE TABLE IF NOT EXISTS control_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  is_mcr BOOLEAN DEFAULT false,
  is_dsr BOOLEAN DEFAULT false,
  is_minimum_requirement BOOLEAN GENERATED ALWAYS AS (is_mcr OR is_dsr) STORED,
  rationale TEXT,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_control_classifications_org ON control_classifications(org_id);
CREATE INDEX IF NOT EXISTS idx_control_classifications_mcr ON control_classifications(is_mcr) WHERE is_mcr = true;
CREATE INDEX IF NOT EXISTS idx_control_classifications_dsr ON control_classifications(is_dsr) WHERE is_dsr = true;

COMMENT ON TABLE control_classifications IS 'Organization-specific control classifications - MCR (compliance-required) vs DSR (discretionary)';
COMMENT ON COLUMN control_classifications.is_mcr IS 'Minimum Compliance Requirement - mandated by laws/regs/contracts';
COMMENT ON COLUMN control_classifications.is_dsr IS 'Discretionary Security Requirement - adopted for risk/best practice';
COMMENT ON COLUMN control_classifications.is_minimum_requirement IS 'Computed: true if MCR OR DSR - part of org minimum baseline';

-- Threat-Control Junction Table
CREATE TABLE IF NOT EXISTS threat_controls (
  threat_id UUID REFERENCES threats(id) ON DELETE CASCADE,
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  mitigation_level TEXT DEFAULT 'mitigates',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (threat_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_threat_controls_threat ON threat_controls(threat_id);
CREATE INDEX IF NOT EXISTS idx_threat_controls_control ON threat_controls(control_id);

COMMENT ON TABLE threat_controls IS 'Links threats to controls that address/mitigate them';
COMMENT ON COLUMN threat_controls.mitigation_level IS 'How control addresses threat: mitigates, prevents, detects, responds';

-- ============================================================================
-- 4. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE control_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_controls ENABLE ROW LEVEL SECURITY;

-- control_baselines: Public read (baselines are standard), no user writes
CREATE POLICY "control_baselines_select_all" ON control_baselines
  FOR SELECT USING (true);

-- control_classifications: Users can see and manage their org's classifications
CREATE POLICY "control_classifications_select_own_org" ON control_classifications
  FOR SELECT USING (
    org_id IN (
      SELECT id FROM organizations WHERE id = org_id
    )
  );

CREATE POLICY "control_classifications_insert_own_org" ON control_classifications
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE id = org_id
    )
  );

CREATE POLICY "control_classifications_update_own_org" ON control_classifications
  FOR UPDATE USING (
    org_id IN (
      SELECT id FROM organizations WHERE id = org_id
    )
  );

CREATE POLICY "control_classifications_delete_own_org" ON control_classifications
  FOR DELETE USING (
    org_id IN (
      SELECT id FROM organizations WHERE id = org_id
    )
  );

-- threat_controls: Public read (threat mappings are standard)
CREATE POLICY "threat_controls_select_all" ON threat_controls
  FOR SELECT USING (true);

-- ============================================================================
-- 5. DATA MIGRATION NOTES
-- ============================================================================

-- After running this migration, execute import scripts in order:
-- 1. scripts/import_authoritative_sources.py
-- 2. scripts/import_threat_catalog.py
-- 3. scripts/import_risk_catalog.py
-- 4. scripts/update_scf_controls_enhancements.py
-- 5. scripts/import_scf_core_baselines.py
-- 6. scripts/import_risk_control_mappings.py
-- 7. scripts/import_threat_control_mappings.py
-- 8. scripts/import_framework_mappings_enhanced.py

COMMENT ON SCHEMA public IS 'SCF Full Data Model - Migration applied 2025-11-25';
