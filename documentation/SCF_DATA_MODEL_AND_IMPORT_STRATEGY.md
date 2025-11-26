# SCF Data Model & Import Strategy
**Version:** 1.0  
**Date:** November 25, 2025  
**Excel Source:** `secure-controls-framework-scf-2025-3-1 (1).xlsx`

## Executive Summary

This document maps the complete Secure Controls Framework (SCF) 2025.3.1 Excel workbook structure to the GRC Unified Platform database schema. It serves as the authoritative reference for understanding:

1. How SCF controls, frameworks, threats, risks, baselines, and maturity models interconnect
2. The column-to-database-table mapping strategy
3. Import sequencing and data relationships
4. Backup and rollback procedures

---

## 1. Excel Workbook Structure

### Tabs Overview

| Tab Name | Purpose | Row Count | Import Priority |
|----------|---------|-----------|-----------------|
| **SCF Domains & Principles** | Top-level conceptual structure | ~20 domains | Phase 1 |
| **Authoritative Sources** | Framework definitions (259 frameworks) | 259 | Phase 1 |
| **SCF 2025.3.1** | Main control catalog (1,420 controls) | 1,420 | Phase 2 |
| **Threat Catalog** | Threat definitions (NT-*, MT-*, FT-*) | ~50 threats | Phase 3 |
| **Risk Catalog** | Risk definitions (R-AC-*, R-AM-*, etc.) | ~200 risks | Phase 3 |
| **Assessment Objectives 2025.3.1** | Testing procedures per control | ~3,000 AOs | Phase 4 |
| **Evidence Request List 2025.3.1** | Evidence artifacts per control | ~500 items | Phase 4 |
| **Data Privacy Mgmt Principles** | Privacy principle → control mapping | ~15 principles | Phase 5 |
| **Lists** | Reference lists and lookups | Variable | Phase 5 |

---

## 2. SCF 2025.3.1 Tab - Column Structure (379 columns total)

### 2.1 Core Control Metadata (Columns A-AB, indices 0-27)

| Column | Index | Field | Database Table | Notes |
|--------|-------|-------|----------------|-------|
| A | 0 | SCF Domain | `scf_controls.domain` | GOV, AST, IAC, etc. |
| B | 1 | SCF Control | `scf_controls.title` | Human-readable title |
| C | 2 | SCF # | `scf_controls.control_id` | Primary key (GOV-01, AAT-01.1) |
| D | 3 | Control Description | `scf_controls.description` | Full control statement |
| E-L | 4-11 | Various metadata | `scf_controls.metadata` | Store as JSONB |
| M | 12 | Relative Control Weighting | `scf_controls.weight` | Materiality score |
| N | 13 | PPTDF People | `scf_controls.applicability_people` | Boolean |
| O | 14 | PPTDF Process | `scf_controls.applicability_processes` | Boolean |
| P | 15 | PPTDF Technology | `scf_controls.applicability_technology` | Boolean |
| Q | 16 | PPTDF Data | `scf_controls.applicability_data` | Boolean |
| R | 17 | PPTDF Facility | `scf_controls.applicability_facilities` | Boolean |
| S-V | 18-21 | C|P-RMM, ESP, SIG | `scf_controls.metadata` | Store as JSONB |
| W-AB | 22-27 | C\|P-CMM 0-5 | `maturity_assessments` (separate table) | Maturity levels |

### 2.2 SCRM Focus (Columns T-V, indices 19-21)

| Column | Index | Field | Database Column | Values |
|--------|-------|-------|-----------------|--------|
| T | 19 | SCRM Focus - TIER 1 - STRATEGIC | `scf_controls.scrm_tier1` | Boolean (x = true) |
| U | 20 | SCRM Focus - TIER 2 - OPERATIONAL | `scf_controls.scrm_tier2` | Boolean (x = true) |
| V | 21 | SCRM Focus - TIER 3 - TACTICAL | `scf_controls.scrm_tier3` | Boolean (x = true) |

### 2.3 Framework Mappings (Columns AC-NJ, indices 28-269)

**Total Framework Mapping Columns:** 242

| Start Column | End Column | Index Range | Description |
|--------------|------------|-------------|-------------|
| AC | NJ | 28-269 | Each column = one framework/standard |

**Sample Framework Columns:**

| Column | Index | Framework | Geography | Database Handling |
|--------|-------|-----------|-----------|-------------------|
| AC | 28 | AICPA TSC 2017:2022 (SOC 2) | Universal | Match to `frameworks` table |
| AE | 30 | CIS CSC v8.1 | Universal | Match to existing framework |
| GQ | 198 | **EMEA EU GDPR** | EMEA | 42+ mappings in this column |
| NJ | 269 | Americas Uruguay | Americas | Last mapping column |

**Mapping Logic:**
- Non-empty cell → Create entry in `scf_control_mappings`
- Cell value = external framework's clause/requirement ID
- Example: Cell GQ in row for GOV-01 contains "Art. 32" → Maps GOV-01 to GDPR Article 32

### 2.4 SCF CORE Baselines (Columns JZ-KG, indices 285-292)

**Purpose:** Pre-built control sets for specific use cases

| Column | Index | Baseline Name | Database Column | Notes |
|--------|-------|---------------|-----------------|-------|
| JZ | 285 | SCF CORE - Community Derived | `control_baselines.baseline_type` | enum value: 'community_derived' |
| KA | 286 | SCF CORE - Fundamentals | `control_baselines.baseline_type` | enum value: 'fundamentals' |
| KB | 287 | SCF CORE - MA&D | `control_baselines.baseline_type` | enum value: 'mad' |
| KC | 288 | SCF CORE - ESP Level 1 | `control_baselines.baseline_type` | enum value: 'esp_l1' |
| KD | 289 | SCF CORE - ESP Level 2 | `control_baselines.baseline_type` | enum value: 'esp_l2' |
| KE | 290 | SCF CORE - ESP Level 3 | `control_baselines.baseline_type` | enum value: 'esp_l3' |
| KF | 291 | SCF CORE - AI-Enabled Operations | `control_baselines.baseline_type` | enum value: 'ai_enabled' |
| KG | 292 | SCF CORE - AI Model Deployment | `control_baselines.baseline_type` | enum value: 'ai_model' |

**Import Strategy:**
```python
# For each non-empty cell in SCF CORE columns:
if cell_value:  # Usually contains the SCF # again (e.g., "GOV-01")
    INSERT INTO control_baselines (control_id, baseline_type, included)
    VALUES (control_id, baseline_type_enum, true)
```

### 2.5 Minimum Security Requirements (Columns KH-KJ, indices 293-295)

| Column | Index | Field | Database Column | Notes |
|--------|-------|-------|-----------------|-------|
| KH | 293 | Minimum Security Requirements - MCR + DSR | `control_classifications.is_minimum_requirement` | Boolean |
| KI | 294 | Identify - Minimum Compliance Requirements (MCR) | `control_classifications.is_mcr` | Boolean - legally required |
| KJ | 295 | Identify - Discretionary Security Requirements (DSR) | `control_classifications.is_dsr` | Boolean - risk-based choice |

**Relationship:**
```
MCR + DSR = Union of compliance-driven and discretionary controls
is_minimum_requirement = (is_mcr OR is_dsr)
```

### 2.6 Risk-Control Mappings (Columns KK-LX, indices 296-335)

**Column KK (index 296): Risk Threat Summary**
- Contains comma-separated list of Risk IDs (e.g., "R-AC-1, R-AC-2, R-GV-1")
- Maps to → `risk_controls` table

**Columns KL-LX (indices 297-335): Individual Risk Columns**
- Each column represents ONE risk from Risk Catalog
- Column header = Risk ID (e.g., "Risk R-AC-1")
- Non-empty cell = this control mitigates this risk
- Creates entry in `risk_controls` junction table

**Import Logic:**
```python
# Parse KK summary column
risk_ids = parse_comma_separated(cell_value)
for risk_id in risk_ids:
    risk_record = find_risk_by_id(risk_id)  # Lookup in risks table
    INSERT INTO risk_controls (risk_id, control_id, control_effectiveness)
    VALUES (risk_record.id, control.id, 'effective')  # Default to effective

# Cross-reference with individual risk columns (KL-LX) for validation
```

### 2.7 Threat-Control Mappings (Columns LY-NN, indices 336-373)

**Column LY (index 336): Control Threat Summary**
- Contains comma-separated list of Threat IDs (e.g., "MT-2, MT-5, NT-1")
- Maps to → `threat_controls` table (new junction table needed)

**Columns LZ-NN (indices 337-373): Individual Threat Columns**
- Each column represents ONE threat from Threat Catalog
- Column header = Threat ID (e.g., "Threat MT-2")
- Non-empty cell = this control addresses this threat
- Creates entry in `threat_controls` junction table

**Import Logic:**
```python
# Parse LY summary column
threat_ids = parse_comma_separated(cell_value)
for threat_id in threat_ids:
    threat_record = find_threat_by_id(threat_id)  # Lookup in threats table
    INSERT INTO threat_controls (threat_id, control_id, mitigation_level)
    VALUES (threat_record.id, control.id, 'mitigates')  # Default
```

### 2.8 Errata (Column NO, index 374)

| Column | Index | Field | Database Column | Notes |
|--------|-------|-------|-----------------|-------|
| NO | 374 | Errata 2025.3.1 | `scf_controls.errata_notes` | Text field for corrections |

---

## 3. Database Schema Enhancements Needed

### 3.1 New Tables Required

#### 3.1.1 `control_baselines` - SCF CORE membership

```sql
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

CREATE TABLE control_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  baseline_type baseline_type NOT NULL,
  included BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, baseline_type)
);

CREATE INDEX idx_control_baselines_type ON control_baselines(baseline_type);
CREATE INDEX idx_control_baselines_control ON control_baselines(control_id);
```

#### 3.1.2 `control_classifications` - MCR/DSR/MSR tags

```sql
CREATE TABLE control_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  is_mcr BOOLEAN DEFAULT false,  -- Minimum Compliance Requirement
  is_dsr BOOLEAN DEFAULT false,  -- Discretionary Security Requirement
  is_minimum_requirement BOOLEAN GENERATED ALWAYS AS (is_mcr OR is_dsr) STORED,
  rationale TEXT,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, control_id)
);

CREATE INDEX idx_control_classifications_org ON control_classifications(org_id);
CREATE INDEX idx_control_classifications_mcr ON control_classifications(is_mcr) WHERE is_mcr = true;
CREATE INDEX idx_control_classifications_dsr ON control_classifications(is_dsr) WHERE is_dsr = true;
```

#### 3.1.3 `threat_controls` - Threat→Control junction

```sql
CREATE TABLE threat_controls (
  threat_id UUID REFERENCES threats(id) ON DELETE CASCADE,
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  mitigation_level TEXT DEFAULT 'mitigates',  -- mitigates, prevents, detects, responds
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (threat_id, control_id)
);

CREATE INDEX idx_threat_controls_threat ON threat_controls(threat_id);
CREATE INDEX idx_threat_controls_control ON threat_controls(control_id);
```

### 3.2 Columns to Add to Existing Tables

#### 3.2.1 `scf_controls` table additions

```sql
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS scrm_tier1 BOOLEAN DEFAULT false;
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS scrm_tier2 BOOLEAN DEFAULT false;
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS scrm_tier3 BOOLEAN DEFAULT false;
ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS errata_notes TEXT;
```

#### 3.2.2 `frameworks` table additions

```sql
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS geography TEXT;  -- Universal, EMEA, Americas, APAC
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS source_organization TEXT;  -- NIST, ISO, AICPA, etc.
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS mapping_column_header TEXT;  -- Original Excel column header
```

### 3.3 Enhanced `threats` Table

```sql
-- Ensure threats table has proper structure
ALTER TABLE threats ADD COLUMN IF NOT EXISTS threat_id TEXT UNIQUE;  -- NT-1, MT-2, FT-1
ALTER TABLE threats ADD COLUMN IF NOT EXISTS threat_grouping TEXT;  -- Natural Threat, Man-Made Threat
```

### 3.4 Enhanced `risks` Table

```sql
-- Ensure risks table has proper structure  
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_grouping TEXT;  -- Access Control, Asset Management, etc.
ALTER TABLE risks ADD COLUMN IF NOT EXISTS nist_csf_function TEXT;  -- Identify, Protect, Detect, Respond, Recover
```

---

## 4. Data Relationships & Traceability Chain

### 4.1 Complete Traceability Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         THREAT CATALOG                          │
│  (Natural & Man-Made threats that can materialize)             │
│  Examples: NT-1 (Drought), MT-2 (Cybersecurity), FT-1 (Fire)  │
└────────────────────────┬────────────────────────────────────────┘
                         │ creates/contributes to
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                          RISK CATALOG                           │
│  (Consequences if threats materialize)                         │
│  Examples: R-AC-1 (Unauthorized Access), R-BC-1 (Interruption) │
└────────────────────────┬────────────────────────────────────────┘
                         │ mitigated by
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SCF CONTROLS                              │
│  (1,420 controls - what to implement)                          │
│  Examples: IAC-02 (Access Control), GOV-01 (Governance)       │
└────────────┬───────────┴──────────┬─────────────────────────────┘
             │                      │
             │ maps to              │ organized into
             ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│ EXTERNAL FRAMEWORKS  │  │         SCF CORE BASELINES           │
│  (259 frameworks)    │  │  - Fundamentals (small orgs)        │
│  - NIST 800-53       │  │  - ESP L1/L2/L3 (service providers) │
│  - ISO 27001/27002   │  │  - AI-Enabled Operations            │
│  - GDPR              │  │  - MA&D (mergers/acquisitions)      │
│  - SOC 2 (TSC)       │  │                                      │
│  - PCI DSS           │  └───────────┬──────────────────────────┘
│  - CIS Controls      │              │
└──────────────────────┘              │
             │                        │
             │ implemented by         │ customized via
             ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              ORGANIZATION-SPECIFIC BASELINE                      │
│  MCR (Minimum Compliance) + DSR (Discretionary Security)       │
│  = Your minimum security requirements                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ assessed via
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              MATURITY ASSESSMENT (C|P-CMM 0-5)                  │
│  How well is each control implemented?                         │
│  - 0: Not Performed                                            │
│  - 1: Informal                                                 │
│  - 3: Well Defined                                             │
│  - 5: Continuously Improving                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ verified through
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ASSESSMENT OBJECTIVES                         │
│  (How to test - Interview, Examine, Test)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ proven with
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVIDENCE ARTIFACTS                           │
│  (Policies, Logs, Tickets, Reports)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Database Query Patterns

#### 4.2.1 "Show me all controls that mitigate ransomware risk"
```sql
SELECT c.control_id, c.title, r.title as risk_name
FROM scf_controls c
JOIN risk_controls rc ON rc.control_id = c.id
JOIN risks r ON r.id = rc.risk_id
WHERE r.title ILIKE '%ransomware%' OR r.description ILIKE '%ransomware%';
```

#### 4.2.2 "What's my ESP Level 2 baseline?"
```sql
SELECT c.control_id, c.title, c.domain
FROM scf_controls c
JOIN control_baselines cb ON cb.control_id = c.id
WHERE cb.baseline_type = 'esp_l2' AND cb.included = true
ORDER BY c.control_id;
```

#### 4.2.3 "Which GDPR requirements does IAC-02 satisfy?"
```sql
SELECT f.name, f.version, scm.external_control_id
FROM scf_control_mappings scm
JOIN frameworks f ON f.id = scm.framework_id
JOIN scf_controls c ON c.id = scm.scf_control_id
WHERE c.control_id = 'IAC-02' AND f.code = 'GDPR';
```

#### 4.2.4 "Show threats → risks → controls chain for cybersecurity threats"
```sql
WITH threat_risk_map AS (
  -- Implicit: threats create risks (documented in Risk Catalog)
  SELECT t.threat_id, t.name as threat_name, r.risk_id, r.title as risk_name
  FROM threats t
  CROSS JOIN risks r  -- Simplified; actual mapping in metadata
  WHERE t.threat_grouping = 'Man-Made Threat' AND t.name ILIKE '%cyber%'
)
SELECT trm.threat_name, trm.risk_name, c.control_id, c.title as control_name
FROM threat_risk_map trm
JOIN risk_controls rc ON rc.risk_id = (SELECT id FROM risks WHERE risk_id = trm.risk_id)
JOIN scf_controls c ON c.id = rc.control_id;
```

---

## 5. Import Execution Plan

### Phase 1: Foundation (Frameworks & Threats/Risks)

**Step 1.1: Import Authoritative Sources (259 frameworks)**
```python
# File: scripts/import_authoritative_sources.py
# Tab: Authoritative Sources
# Columns: A (Geography), B (Mapping Column Header), C (Source)
# Output: INSERT/UPDATE frameworks table with geography, source, mapping_column_header
```

**Step 1.2: Import Threat Catalog**
```python
# File: scripts/import_threat_catalog.py
# Tab: Threat Catalog
# Start Row: 8 (first data row after headers)
# Columns: A (Threat Grouping), B (Threat #), C (Threat Name), D (Description)
# Output: INSERT INTO threats table
```

**Step 1.3: Import Risk Catalog**
```python
# File: scripts/import_risk_catalog.py
# Tab: Risk Catalog
# Start Row: 8 (first data row after headers)
# Columns: A (Risk Grouping), B (Risk #), C (Risk Name), D (Description), E (NIST CSF Function)
# Output: INSERT INTO risks table
```

### Phase 2: Controls & Baselines

**Step 2.1: Re-import SCF Controls (enhanced)**
```python
# File: scripts/import_scf_controls_enhanced.py
# Tab: SCF 2025.3.1
# NEW columns to process:
# - T-V (SCRM Tier 1-3)
# - NO (Errata)
# Output: UPDATE scf_controls table with new fields
```

**Step 2.2: Import SCF CORE Baselines**
```python
# File: scripts/import_scf_core_baselines.py
# Tab: SCF 2025.3.1
# Columns: JZ-KG (indices 285-292)
# Logic: For each non-empty cell, INSERT INTO control_baselines
# Output: control_baselines table populated
```

### Phase 3: Mappings (Risk/Threat Linkages)

**Step 3.1: Import Risk-Control Mappings**
```python
# File: scripts/import_risk_control_mappings.py
# Tab: SCF 2025.3.1
# Column KK (index 296): Risk Threat Summary - parse comma-separated Risk IDs
# Columns KL-LX (indices 297-335): Individual risk columns for validation
# Output: INSERT INTO risk_controls junction table
```

**Step 3.2: Import Threat-Control Mappings**
```python
# File: scripts/import_threat_control_mappings.py
# Tab: SCF 2025.3.1
# Column LY (index 336): Control Threat Summary - parse comma-separated Threat IDs
# Columns LZ-NN (indices 337-373): Individual threat columns for validation
# Output: INSERT INTO threat_controls junction table
```

**Step 3.3: Re-import Framework Mappings (enhanced)**
```python
# File: scripts/import_framework_mappings_enhanced.py
# Tab: SCF 2025.3.1
# Columns AC-NJ (indices 28-269): All 242 framework columns
# Enhancement: Match column headers to frameworks.mapping_column_header
# Output: UPDATE scf_control_mappings with correct framework linkage
```

### Phase 4: Assessment & Evidence

**Step 4.1: Import Assessment Objectives**
```python
# File: scripts/import_assessment_objectives_enhanced.py
# Tab: Assessment Objectives 2025.3.1
# Link AOs to controls via SCF #
# Output: assessment_objectives table (create if needed)
```

**Step 4.2: Import Evidence Request List**
```python
# File: scripts/import_evidence_list.py
# Tab: Evidence Request List 2025.3.1
# Map evidence items to controls
# Output: evidence_templates table (enhanced)
```

### Phase 5: Privacy & Supplemental

**Step 5.1: Import Privacy Principles**
```python
# File: scripts/import_privacy_principles.py
# Tab: Data Privacy Mgmt Principles
# Link principles to supporting controls
# Output: privacy_principles table + junction to scf_controls
```

---

## 6. Backup & Rollback Strategy

### 6.1 Pre-Import Backup

```bash
# Backup entire database
docker exec supabase_db_GRC_Unified_Platform pg_dump -U postgres -d postgres -F c -f /tmp/backup_pre_scf_full_import_$(date +%Y%m%d_%H%M%S).dump

# Backup specific tables only
docker exec supabase_db_GRC_Unified_Platform pg_dump -U postgres -d postgres \
  -t scf_controls \
  -t frameworks \
  -t scf_control_mappings \
  -t threats \
  -t risks \
  -t users \
  -t saved_views \
  -F c -f /tmp/backup_critical_tables_$(date +%Y%m%d_%H%M%S).dump
```

### 6.2 Restore Procedure

```bash
# Restore full database
docker exec -i supabase_db_GRC_Unified_Platform pg_restore -U postgres -d postgres -c /tmp/backup_file.dump

# Restore specific tables
docker exec -i supabase_db_GRC_Unified_Platform pg_restore -U postgres -d postgres -t scf_controls /tmp/backup_file.dump
```

### 6.3 Data Preservation Rules

**NEVER delete:**
- `users` table (1 user exists)
- `saved_views` table (1 view exists)
- Existing `scf_controls` (1,420 records) - only UPDATE
- Existing `frameworks` (42 records) - only UPDATE/INSERT
- Existing `scf_control_mappings` (14,536 records) - can be replaced if re-imported from Excel

**Safe to replace:**
- `threats` (currently 0 records)
- `risks` (currently 0 records)
- `risk_controls` (new table)
- `threat_controls` (new table)
- `control_baselines` (new table)
- `control_classifications` (new table)

---

## 7. Validation & Testing

### 7.1 Post-Import Validation Queries

```sql
-- Verify counts match Excel
SELECT 
  (SELECT COUNT(*) FROM scf_controls) as controls_should_be_1420,
  (SELECT COUNT(*) FROM frameworks) as frameworks_should_be_259_or_more,
  (SELECT COUNT(*) FROM threats) as threats_should_be_around_50,
  (SELECT COUNT(*) FROM risks) as risks_should_be_around_200,
  (SELECT COUNT(*) FROM scf_control_mappings) as mappings_should_increase,
  (SELECT COUNT(*) FROM risk_controls) as risk_control_links_should_exist,
  (SELECT COUNT(*) FROM threat_controls) as threat_control_links_should_exist,
  (SELECT COUNT(*) FROM control_baselines) as baseline_memberships_should_exist;
```

### 7.2 Smoke Tests

```sql
-- Test 1: GDPR column (GQ) should have ~42+ mappings
SELECT COUNT(*) FROM scf_control_mappings scm
JOIN frameworks f ON f.id = scm.framework_id
WHERE f.code = 'GDPR' AND f.version = '2018';
-- Expected: 42+

-- Test 2: ESP Level 2 baseline should have controls
SELECT COUNT(*) FROM control_baselines
WHERE baseline_type = 'esp_l2' AND included = true;
-- Expected: 200-400 controls

-- Test 3: Cybersecurity threat (MT-2) should link to multiple controls
SELECT COUNT(*) FROM threat_controls tc
JOIN threats t ON t.id = tc.threat_id
WHERE t.threat_id = 'MT-2';
-- Expected: 50+ controls

-- Test 4: Access Control risks should link to IAC controls
SELECT COUNT(*) FROM risk_controls rc
JOIN risks r ON r.id = rc.risk_id
JOIN scf_controls c ON c.id = rc.control_id
WHERE r.risk_grouping = 'Access Control' AND c.domain = 'Identity & Access Control';
-- Expected: 10+ mappings
```

---

## 8. Reference Tables

### 8.1 Excel Column Index Quick Reference

| Section | Start Col | End Col | Start Idx | End Idx | Count | Purpose |
|---------|-----------|---------|-----------|---------|-------|---------|
| Core Metadata | A | AB | 0 | 27 | 28 | Control definition |
| Framework Mappings | AC | NJ | 28 | 269 | 242 | External standard mappings |
| SCF CORE Baselines | JZ | KG | 285 | 292 | 8 | Baseline membership |
| MCR/DSR/MSR | KH | KJ | 293 | 295 | 3 | Minimum requirements |
| Risk Mappings | KK | LX | 296 | 335 | 40 | Risk mitigation |
| Threat Mappings | LY | NN | 336 | 373 | 38 | Threat coverage |
| Errata | NO | NO | 374 | 374 | 1 | Corrections |

### 8.2 Baseline Types Enum Values

```sql
-- For control_baselines.baseline_type
'community_derived'
'fundamentals'
'mad'        -- Mergers, Acquisitions & Divestitures
'esp_l1'     -- ESP Level 1 Foundational
'esp_l2'     -- ESP Level 2 Critical Infrastructure
'esp_l3'     -- ESP Level 3 Advanced Threats
'ai_enabled' -- AI-Enabled Operations
'ai_model'   -- AI Model Deployment
```

### 8.3 Maturity Levels (C|P-CMM)

| Level | Enum Value | Description | Column Index |
|-------|------------|-------------|--------------|
| 0 | 'L0' | Not Performed | 22 |
| 1 | 'L1' | Performed Informally | 23 |
| 2 | 'L2' | Planned & Tracked | 24 |
| 3 | 'L3' | Well Defined | 25 |
| 4 | 'L4' | Quantitatively Controlled | 26 |
| 5 | 'L5' | Continuously Improving | 27 |

---

## 9. Import Script Template

```python
#!/usr/bin/env python3
"""
Template for SCF import scripts
"""
import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "/path/to/secure-controls-framework-scf-2025-3-1 (1).xlsx"

def main():
    # 1. Connect to database
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # 2. Load Excel workbook
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb['Tab Name']
    
    # 3. Extract and transform data
    records = []
    for row in ws.iter_rows(min_row=START_ROW, values_only=True):
        # Parse row
        record = {
            'field1': row[COL_INDEX_1],
            'field2': row[COL_INDEX_2]
        }
        records.append(record)
    
    # 4. Insert into database
    insert_query = """
        INSERT INTO table_name (field1, field2)
        VALUES (%s, %s)
        ON CONFLICT (unique_field) DO UPDATE SET field2 = EXCLUDED.field2
    """
    execute_values(cur, insert_query, [(r['field1'], r['field2']) for r in records])
    
    # 5. Commit and report
    conn.commit()
    print(f"Inserted {len(records)} records")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
```

---

## 10. Next Steps & Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Prep** | Review plan, create schema migration | 1 hour | This document |
| **Phase 1** | Import frameworks, threats, risks | 2 hours | Database backup |
| **Phase 2** | Import controls enhancements, baselines | 1 hour | Phase 1 complete |
| **Phase 3** | Import risk/threat mappings | 2 hours | Phase 1 & 2 complete |
| **Phase 4** | Import AOs and evidence | 1 hour | Phase 3 complete |
| **Phase 5** | Import privacy principles | 30 min | Phase 4 complete |
| **Validation** | Run tests, fix issues | 1 hour | All phases complete |

**Total Estimated Time:** 8.5 hours

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-25 | System | Initial documentation based on Excel analysis |

---

**End of Document**
