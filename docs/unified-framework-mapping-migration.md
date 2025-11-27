# Unified Framework Mapping Migration Plan

**Branch**: `feature/unified-framework-mappings`
**Created**: 2025-11-27
**Author**: Claude Code + David Moneil
**Status**: Planning

---

## Executive Summary

This document describes the migration from SCF-centric tables (`scf_controls`, `scf_control_mappings`) to a unified framework mapping architecture using `external_controls` and `framework_crosswalks`. This enables:

1. **Any-to-any framework comparisons** (not just SCF-centric)
2. **Multiple mapping origins** (SCF, NIST, ISO, custom)
3. **Future-proof architecture** for loading crosswalks from various sources

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target State Architecture](#2-target-state-architecture)
3. [Schema Changes](#3-schema-changes)
4. [Data Migration](#4-data-migration)
5. [Frontend Code Changes](#5-frontend-code-changes)
6. [Migration Execution Plan](#6-migration-execution-plan)
7. [Rollback Plan](#7-rollback-plan)
8. [Testing Checklist](#8-testing-checklist)
9. [Post-Migration Cleanup](#9-post-migration-cleanup)

---

## 1. Current State Analysis

### 1.1 Table Inventory

| Table | Rows | Purpose | Status |
|-------|------|---------|--------|
| `frameworks` | 125 | Metadata about frameworks (name, version, description) | KEEP |
| `external_controls` | 12,962 | Controls from external frameworks with hierarchy | KEEP |
| `scf_controls` | 1,420 | SCF-specific controls (separate table) | **MIGRATE → external_controls** |
| `scf_control_mappings` | 32,489 | Maps SCF ↔ external controls | **MIGRATE → framework_crosswalks** |
| `framework_crosswalks` | 0 | Generic framework-to-framework mappings | **USE (currently empty)** |

### 1.2 Current Data Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│  scf_controls   │────▶│ scf_control_mappings │◀────│ external_controls │
│   (1,420 SCF)   │     │     (32,489 maps)    │     │  (12,962 others)  │
└─────────────────┘     └──────────────────────┘     └───────────────────┘
        │                         │                           │
        │                         ▼                           │
        │              ┌─────────────────┐                    │
        └─────────────▶│   frameworks    │◀───────────────────┘
                       │  (125 entries)  │
                       └─────────────────┘
```

### 1.3 Current Mapping Structure (`scf_control_mappings`)

```sql
scf_control_mappings:
  - scf_control_id      → references scf_controls(id)
  - external_control_id → references external_controls(id)
  - framework_id        → references frameworks(id)
  - mapping_strength    → 'exact', 'partial', 'related'
  - confidence          → 0-100
  - notes
```

**Direction**: SCF (source) → External Framework (target)

### 1.4 Frontend Dependencies

Files that reference `scf_control_mappings`:
- `frontend/lib/hooks/useControlMappings.ts` (6 references)
  - Line 74: `useControlMappings()` query
  - Line 344: `useControlMappingsByFramework()` query
  - Line 376: comparison mappings query
  - Line 534: `useControlMappingsByFrameworkGrouped()` SCF mappings
  - Line 568: comparison framework query
  - Line 602: additional frameworks query

Files that reference `scf_controls`:
- `frontend/lib/hooks/useControlMappings.ts`
  - Line 471-476: Direct query to `scf_controls` when SCF is primary

---

## 2. Target State Architecture

### 2.1 Unified Data Model

```
┌───────────────────────────────────────────────────────────────┐
│                      external_controls                         │
│  (ALL controls including SCF - unified in one table)          │
│  - 12,962 existing + 1,420 SCF = ~14,382 total               │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    framework_crosswalks                        │
│  (ALL mappings with origin tracking)                          │
│  - source_framework_id, source_ref                            │
│  - target_framework_id, target_ref                            │
│  - mapping_origin: 'SCF' | 'NIST' | 'ISO' | 'custom'         │
│  - mapping_strength, confidence, notes                        │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                        frameworks                              │
│  (Metadata about all frameworks including SCF)                │
│  - 125 frameworks (SCF already exists)                        │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Origin Support

The `mapping_origin` field tracks WHO defined the mapping:

```
┌─────────────────────────────────────────────────────────────────┐
│ CURRENT (SCF-sourced):                                          │
│   source: SCF GOV-01  →  target: NIST CSF GV.OC-01             │
│   mapping_origin: 'SCF'                                         │
│   (Meaning: SCF spreadsheet says these are equivalent)          │
├─────────────────────────────────────────────────────────────────┤
│ FUTURE (NIST-sourced):                                          │
│   source: NIST CSF GV.OC-01  →  target: ISO 27001 A.5.1.1      │
│   mapping_origin: 'NIST'                                        │
│   (Meaning: NIST crosswalk says these are equivalent)           │
├─────────────────────────────────────────────────────────────────┤
│ FUTURE (Custom):                                                │
│   source: ISO 27001 A.5.1.1  →  target: GDPR Article 32        │
│   mapping_origin: 'custom'                                      │
│   (Meaning: User/organization defined this mapping)             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Query Patterns

**Compare Framework A to Framework B:**
```sql
-- Find all controls in Framework A that map to Framework B
SELECT
  ec_source.ref_code as source_control,
  ec_target.ref_code as target_control,
  fc.mapping_strength,
  fc.mapping_origin
FROM framework_crosswalks fc
JOIN external_controls ec_source ON fc.source_framework_id = ec_source.framework_id
                                 AND fc.source_ref = ec_source.ref_code
JOIN external_controls ec_target ON fc.target_framework_id = ec_target.framework_id
                                 AND fc.target_ref = ec_target.ref_code
WHERE fc.source_framework_id = :framework_a_id
  AND fc.target_framework_id = :framework_b_id;
```

**Find all mappings for a specific control (any direction):**
```sql
-- Find everything related to NIST CSF GV.OC-01
SELECT * FROM framework_crosswalks
WHERE (source_framework_id = :nist_id AND source_ref = 'GV.OC-01')
   OR (target_framework_id = :nist_id AND target_ref = 'GV.OC-01');
```

---

## 3. Schema Changes

### 3.1 Modify `framework_crosswalks` Table

```sql
-- Migration: 20251127000001_add_mapping_origin_to_crosswalks.sql

-- Add mapping_origin column
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS mapping_origin text DEFAULT 'SCF';

-- Add mapping_strength column (exists in scf_control_mappings but not here)
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS mapping_strength text;

-- Add source_control_id and target_control_id for direct FK relationships
-- (optional but improves query performance)
ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS source_control_id uuid REFERENCES external_controls(id) ON DELETE CASCADE;

ALTER TABLE framework_crosswalks
ADD COLUMN IF NOT EXISTS target_control_id uuid REFERENCES external_controls(id) ON DELETE CASCADE;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_crosswalks_mapping_origin
ON framework_crosswalks(mapping_origin);

CREATE INDEX IF NOT EXISTS idx_crosswalks_source_control
ON framework_crosswalks(source_control_id);

CREATE INDEX IF NOT EXISTS idx_crosswalks_target_control
ON framework_crosswalks(target_control_id);

-- Add comments
COMMENT ON COLUMN framework_crosswalks.mapping_origin IS
'Origin of this mapping: SCF, NIST, ISO, custom, etc. Indicates which source document defined this relationship.';

COMMENT ON COLUMN framework_crosswalks.mapping_strength IS
'Strength of mapping: exact, partial, related';

COMMENT ON COLUMN framework_crosswalks.source_control_id IS
'Direct FK to external_controls for the source control (optional, for performance)';

COMMENT ON COLUMN framework_crosswalks.target_control_id IS
'Direct FK to external_controls for the target control (optional, for performance)';
```

### 3.2 Final `framework_crosswalks` Structure

```sql
framework_crosswalks:
  id                  uuid PRIMARY KEY
  source_framework_id uuid REFERENCES frameworks(id)
  source_ref          text NOT NULL
  source_control_id   uuid REFERENCES external_controls(id)  -- NEW
  target_framework_id uuid REFERENCES frameworks(id)
  target_ref          text NOT NULL
  target_control_id   uuid REFERENCES external_controls(id)  -- NEW
  mapping_origin      text DEFAULT 'SCF'                     -- NEW
  mapping_strength    text                                   -- NEW
  confidence          integer
  notes               text
  created_at          timestamptz
```

---

## 4. Data Migration

### 4.1 Phase 1: Migrate SCF Controls to `external_controls`

```sql
-- Migration: 20251127000002_migrate_scf_controls.sql

-- Get SCF framework ID
DO $$
DECLARE
  scf_framework_id uuid;
BEGIN
  SELECT id INTO scf_framework_id FROM frameworks WHERE code = 'SCF';

  IF scf_framework_id IS NULL THEN
    RAISE EXCEPTION 'SCF framework not found in frameworks table';
  END IF;

  -- Insert SCF controls into external_controls
  -- Map fields appropriately
  INSERT INTO external_controls (
    id,
    framework_id,
    ref_code,
    description,
    metadata,
    created_at,
    hierarchy_level,
    is_group
  )
  SELECT
    id,                           -- Keep same UUID for FK compatibility
    scf_framework_id,             -- Link to SCF framework
    control_id,                   -- ref_code = control_id (e.g., GOV-01)
    COALESCE(title, description), -- Use title as description
    jsonb_build_object(
      'domain', domain,
      'weight', weight,
      'is_material_control', is_material_control,
      'is_mcr', is_mcr,
      'is_dsr', is_dsr,
      'applicability_people', applicability_people,
      'applicability_processes', applicability_processes,
      'applicability_technology', applicability_technology,
      'applicability_data', applicability_data,
      'applicability_facilities', applicability_facilities,
      'scf_version', scf_version,
      'original_metadata', metadata,
      'migrated_from', 'scf_controls'
    ) as metadata,
    created_at,
    CASE
      WHEN control_id ~ '^[A-Z]+-\d+\.\d+' THEN 'control'      -- Sub-control like GOV-01.1
      WHEN control_id ~ '^[A-Z]+-\d+' THEN 'parent'           -- Parent like GOV-01
      ELSE 'domain'
    END as hierarchy_level,
    CASE
      WHEN control_id ~ '^[A-Z]+-\d+$' THEN true              -- Parents are groups
      ELSE false
    END as is_group
  FROM scf_controls
  ON CONFLICT (framework_id, ref_code) DO UPDATE SET
    description = EXCLUDED.description,
    metadata = EXCLUDED.metadata;

  RAISE NOTICE 'Migrated SCF controls to external_controls';
END $$;
```

### 4.2 Phase 2: Set Parent-Child Relationships for SCF Controls

```sql
-- Migration: 20251127000003_set_scf_control_hierarchy.sql

-- Set parent_id for SCF sub-controls (e.g., GOV-01.1 → GOV-01)
DO $$
DECLARE
  scf_framework_id uuid;
BEGIN
  SELECT id INTO scf_framework_id FROM frameworks WHERE code = 'SCF';

  -- Update parent_id for sub-controls
  UPDATE external_controls child
  SET parent_id = parent.id
  FROM external_controls parent
  WHERE child.framework_id = scf_framework_id
    AND parent.framework_id = scf_framework_id
    AND child.ref_code ~ '^[A-Z]+-\d+\.\d+'                    -- Child pattern: XXX-00.0
    AND parent.ref_code = regexp_replace(child.ref_code, '\.\d+$', '')  -- Parent pattern: XXX-00
    AND child.parent_id IS NULL;

  RAISE NOTICE 'Set parent_id for SCF sub-controls';
END $$;
```

### 4.3 Phase 3: Migrate Mappings to `framework_crosswalks`

```sql
-- Migration: 20251127000004_migrate_scf_mappings.sql

DO $$
DECLARE
  scf_framework_id uuid;
  migrated_count integer;
BEGIN
  SELECT id INTO scf_framework_id FROM frameworks WHERE code = 'SCF';

  -- Migrate scf_control_mappings → framework_crosswalks
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
    scf_framework_id,                    -- source = SCF
    sc.control_id,                       -- source_ref = SCF control ID
    m.scf_control_id,                    -- source_control_id (now points to external_controls)
    m.framework_id,                      -- target = external framework
    ec.ref_code,                         -- target_ref = external control ref
    m.external_control_id,               -- target_control_id
    'SCF',                               -- mapping_origin = SCF (all existing mappings)
    m.mapping_strength,
    m.confidence,
    m.notes,
    m.created_at
  FROM scf_control_mappings m
  JOIN scf_controls sc ON m.scf_control_id = sc.id
  JOIN external_controls ec ON m.external_control_id = ec.id
  ON CONFLICT (source_framework_id, source_ref, target_framework_id, target_ref)
  DO UPDATE SET
    mapping_strength = EXCLUDED.mapping_strength,
    confidence = EXCLUDED.confidence,
    notes = EXCLUDED.notes;

  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % mappings to framework_crosswalks', migrated_count;
END $$;
```

### 4.4 Phase 4: Verify Migration

```sql
-- Migration: 20251127000005_verify_migration.sql

DO $$
DECLARE
  scf_in_external integer;
  scf_original integer;
  crosswalks_count integer;
  mappings_original integer;
BEGIN
  -- Count SCF controls in external_controls
  SELECT COUNT(*) INTO scf_in_external
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'SCF';

  -- Count original SCF controls
  SELECT COUNT(*) INTO scf_original FROM scf_controls;

  -- Count framework_crosswalks
  SELECT COUNT(*) INTO crosswalks_count FROM framework_crosswalks;

  -- Count original mappings
  SELECT COUNT(*) INTO mappings_original FROM scf_control_mappings;

  RAISE NOTICE '=== Migration Verification ===';
  RAISE NOTICE 'SCF controls in external_controls: % (original: %)', scf_in_external, scf_original;
  RAISE NOTICE 'Framework crosswalks: % (original mappings: %)', crosswalks_count, mappings_original;

  IF scf_in_external < scf_original THEN
    RAISE WARNING 'Not all SCF controls were migrated!';
  END IF;

  IF crosswalks_count < mappings_original THEN
    RAISE WARNING 'Not all mappings were migrated!';
  END IF;
END $$;
```

---

## 5. Frontend Code Changes

### 5.1 Files to Modify

| File | Changes Required |
|------|------------------|
| `frontend/lib/hooks/useControlMappings.ts` | Replace `scf_control_mappings` with `framework_crosswalks` queries |
| `frontend/lib/hooks/useFrameworks.ts` | May need updates for SCF-as-framework queries |

### 5.2 Hook Changes: `useControlMappings.ts`

#### 5.2.1 Update `useControlMappings()` (Line ~74)

**Before:**
```typescript
let query = supabase
  .from('scf_control_mappings')
  .select(`
    *,
    scf_control:scf_control_id (id, control_id, title, domain, description),
    framework:framework_id (id, code, name, version),
    external_control:external_control_id (id, ref_code, description, metadata)
  `)
```

**After:**
```typescript
let query = supabase
  .from('framework_crosswalks')
  .select(`
    *,
    source_framework:source_framework_id (id, code, name, version),
    target_framework:target_framework_id (id, code, name, version),
    source_control:source_control_id (id, ref_code, description, metadata, framework_id),
    target_control:target_control_id (id, ref_code, description, metadata, framework_id)
  `)
```

#### 5.2.2 Update Type Definitions

**Before:**
```typescript
export type ControlMapping = {
  id: string
  scf_control_id: string
  framework_id: string
  external_control_id: string
  mapping_strength: string
  notes: string | null
  scf_control: SCFControl
  framework: Framework
  external_control: ExternalControl
}
```

**After:**
```typescript
export type ControlMapping = {
  id: string
  source_framework_id: string
  source_ref: string
  source_control_id: string
  target_framework_id: string
  target_ref: string
  target_control_id: string
  mapping_origin: string      // NEW
  mapping_strength: string
  confidence: number
  notes: string | null
  source_framework: Framework
  target_framework: Framework
  source_control: ExternalControl
  target_control: ExternalControl
}
```

#### 5.2.3 Update Query Logic

The key change is shifting from "SCF-centric" to "any framework as primary":

**Before (SCF-centric):**
```typescript
// When SCF is primary, query scf_controls directly
const scfQuery = supabase.from('scf_controls').select(...)
```

**After (Unified):**
```typescript
// All frameworks (including SCF) query external_controls
const controlsQuery = supabase
  .from('external_controls')
  .select('...')
  .eq('framework_id', primaryFrameworkId)
```

### 5.3 Backwards Compatibility Strategy

To avoid breaking the app during migration:

1. **Create database views** that mimic old table structure:

```sql
-- View that mimics scf_control_mappings for backwards compatibility
CREATE OR REPLACE VIEW scf_control_mappings_compat AS
SELECT
  fc.id,
  fc.source_control_id as scf_control_id,
  fc.target_control_id as external_control_id,
  fc.target_framework_id as framework_id,
  fc.mapping_strength,
  fc.confidence,
  fc.notes,
  fc.created_at
FROM framework_crosswalks fc
JOIN frameworks f ON fc.source_framework_id = f.id
WHERE f.code = 'SCF';
```

2. **Phased frontend updates**:
   - Phase A: Update hooks to use new tables
   - Phase B: Test thoroughly
   - Phase C: Remove compatibility views

---

## 6. Migration Execution Plan

### 6.1 Pre-Migration Checklist

- [ ] Backup database
- [ ] Verify SCF framework exists in `frameworks` table
- [ ] Verify `framework_crosswalks` table exists
- [ ] Document current row counts for verification
- [ ] Create feature branch (DONE: `feature/unified-framework-mappings`)

### 6.2 Execution Order

```
Step 1: Schema Changes
├── 20251127000001_add_mapping_origin_to_crosswalks.sql
└── Verify: framework_crosswalks has new columns

Step 2: Data Migration
├── 20251127000002_migrate_scf_controls.sql
├── 20251127000003_set_scf_control_hierarchy.sql
├── 20251127000004_migrate_scf_mappings.sql
└── 20251127000005_verify_migration.sql

Step 3: Create Compatibility Views (optional)
└── 20251127000006_create_compat_views.sql

Step 4: Frontend Updates
├── Update useControlMappings.ts
├── Update type definitions
└── Test all views

Step 5: Deprecation
├── Add DEPRECATED comments to old tables
└── Update documentation
```

### 6.3 Estimated LOE

| Task | Estimate |
|------|----------|
| Schema changes | 30 min |
| Data migration scripts | 1 hour |
| Frontend hook updates | 2-3 hours |
| Testing | 1-2 hours |
| Documentation | 30 min |
| **Total** | **5-7 hours** |

---

## 7. Rollback Plan

### 7.1 If Migration Fails

```sql
-- Rollback: Remove migrated data from framework_crosswalks
DELETE FROM framework_crosswalks WHERE mapping_origin = 'SCF';

-- Rollback: Remove SCF controls from external_controls
DELETE FROM external_controls ec
USING frameworks f
WHERE ec.framework_id = f.id AND f.code = 'SCF';

-- Rollback: Remove new columns from framework_crosswalks
ALTER TABLE framework_crosswalks DROP COLUMN IF EXISTS mapping_origin;
ALTER TABLE framework_crosswalks DROP COLUMN IF EXISTS mapping_strength;
ALTER TABLE framework_crosswalks DROP COLUMN IF EXISTS source_control_id;
ALTER TABLE framework_crosswalks DROP COLUMN IF EXISTS target_control_id;
```

### 7.2 If Frontend Breaks

1. Revert frontend changes via git
2. Keep database changes (data is duplicated, not moved)
3. Legacy tables remain functional

---

## 8. Testing Checklist

### 8.1 Data Verification

- [ ] SCF controls count in `external_controls` = 1,420
- [ ] Total `external_controls` = 12,962 + 1,420 = 14,382
- [ ] `framework_crosswalks` count = 32,489
- [ ] SCF controls have correct `framework_id`
- [ ] SCF sub-controls have correct `parent_id`

### 8.2 Frontend Testing

- [ ] `/explore/frameworks/mappings` page loads
- [ ] Can select SCF as primary framework
- [ ] Can select other frameworks as primary
- [ ] Framework comparison works (SCF → NIST CSF)
- [ ] Framework comparison works (NIST CSF → ISO)
- [ ] Saved views load correctly
- [ ] Search functionality works
- [ ] Hierarchy expansion works

### 8.3 Query Performance

- [ ] Page load time < 3 seconds
- [ ] Framework selection response < 1 second
- [ ] No N+1 query issues

---

## 9. Post-Migration Cleanup

### 9.1 Deprecation Comments

```sql
-- Add deprecation notices
COMMENT ON TABLE scf_controls IS
'DEPRECATED (2025-11-27): Use external_controls with framework_id pointing to SCF framework.
This table is kept for backwards compatibility and will be removed in a future release.';

COMMENT ON TABLE scf_control_mappings IS
'DEPRECATED (2025-11-27): Use framework_crosswalks with mapping_origin field.
This table is kept for backwards compatibility and will be removed in a future release.';
```

### 9.2 Future Cleanup Tasks

- [ ] Remove compatibility views after frontend is stable
- [ ] Update import scripts to write to new tables
- [ ] Update any reports/dashboards using old tables
- [ ] Consider removing deprecated tables after 3+ months

---

## Appendix A: Current Table Schemas

### A.1 `scf_controls` (to be deprecated)

```sql
CREATE TABLE scf_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  domain text NOT NULL,
  weight numeric(5,2) DEFAULT 1.0,
  is_material_control boolean DEFAULT false,
  is_mcr boolean DEFAULT false,
  is_dsr boolean DEFAULT false,
  applicability_people boolean DEFAULT false,
  applicability_processes boolean DEFAULT false,
  applicability_technology boolean DEFAULT false,
  applicability_data boolean DEFAULT false,
  applicability_facilities boolean DEFAULT false,
  scf_version text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### A.2 `external_controls` (unified controls table)

```sql
CREATE TABLE external_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid REFERENCES frameworks(id) ON DELETE CASCADE,
  ref_code text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  path ltree,
  parent_id uuid REFERENCES external_controls(id) ON DELETE CASCADE,
  hierarchy_level text,
  display_order integer DEFAULT 0,
  is_group boolean DEFAULT false,
  parent_id_source varchar(32),
  UNIQUE(framework_id, ref_code)
);
```

### A.3 `framework_crosswalks` (unified mappings table - after migration)

```sql
CREATE TABLE framework_crosswalks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_framework_id uuid REFERENCES frameworks(id) ON DELETE CASCADE,
  source_ref text NOT NULL,
  source_control_id uuid REFERENCES external_controls(id) ON DELETE CASCADE,
  target_framework_id uuid REFERENCES frameworks(id) ON DELETE CASCADE,
  target_ref text NOT NULL,
  target_control_id uuid REFERENCES external_controls(id) ON DELETE CASCADE,
  mapping_origin text DEFAULT 'SCF',
  mapping_strength text,
  confidence integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_framework_id, source_ref, target_framework_id, target_ref)
);
```

---

## Appendix B: Example Queries After Migration

### B.1 Compare SCF to NIST CSF

```sql
SELECT
  sc.ref_code as scf_control,
  tc.ref_code as nist_control,
  fc.mapping_strength,
  fc.mapping_origin
FROM framework_crosswalks fc
JOIN external_controls sc ON fc.source_control_id = sc.id
JOIN external_controls tc ON fc.target_control_id = tc.id
JOIN frameworks sf ON fc.source_framework_id = sf.id
JOIN frameworks tf ON fc.target_framework_id = tf.id
WHERE sf.code = 'SCF' AND tf.code = 'NIST-CSF'
ORDER BY sc.ref_code;
```

### B.2 Find All Mappings for a Control (Any Direction)

```sql
SELECT
  sf.name as source_framework,
  fc.source_ref,
  tf.name as target_framework,
  fc.target_ref,
  fc.mapping_origin
FROM framework_crosswalks fc
JOIN frameworks sf ON fc.source_framework_id = sf.id
JOIN frameworks tf ON fc.target_framework_id = tf.id
WHERE fc.source_ref = 'GOV-01' OR fc.target_ref = 'GOV-01';
```

### B.3 Get All Controls for a Framework (Including SCF)

```sql
SELECT ec.ref_code, ec.description, ec.hierarchy_level
FROM external_controls ec
JOIN frameworks f ON ec.framework_id = f.id
WHERE f.code = 'SCF'
ORDER BY ec.ref_code;
```

---

**End of Migration Plan**
