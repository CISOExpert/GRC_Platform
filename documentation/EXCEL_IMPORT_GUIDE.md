# Excel Import Guide for SCF Controls

## Overview

This guide explains how to import SCF control data from Excel files into the GRC Unified Platform database. The schema has been enhanced with dedicated cross-reference columns to support direct Excel imports.

## Database Preparation

### Step 1: Apply the Schema

Run the complete schema in Supabase Studio:

```sql
-- In Supabase Studio SQL Editor:
-- Open: apply_schema.sql
-- Click "Run"
```

This creates all 41+ tables including the enhanced `scf_controls` table with cross-reference fields.

## Excel File Format Requirements

### Expected SCF Excel Structure

Your Excel file should contain columns for:

**Required Columns:**
- `control_id` - SCF identifier (e.g., GOV-01, IAC-02)
- `title` - Control title
- `description` - Control description
- `domain` - SCF domain (Governance, IAC, BCR, etc.)

**PPTDF Columns:**
- `applicability_people` - TRUE/FALSE or Y/N
- `applicability_processes` - TRUE/FALSE or Y/N
- `applicability_technology` - TRUE/FALSE or Y/N
- `applicability_data` - TRUE/FALSE or Y/N
- `applicability_facilities` - TRUE/FALSE or Y/N

**Classification Columns:**
- `weight` - Numeric (default 1.0)
- `is_material_control` - TRUE/FALSE or Y/N
- `is_mcr` - TRUE/FALSE or Y/N (Minimum Compliance Requirement)
- `is_dsr` - TRUE/FALSE or Y/N (Discretionary Security Requirement)

**Cross-Reference Columns:**
- `nist_csf_mapping` - NIST Cybersecurity Framework references
- `nist_800_53_mapping` - NIST 800-53 control references
- `iso_27001_mapping` - ISO 27001 Annex A references
- `iso_27002_mapping` - ISO 27002 control references
- `pci_dss_mapping` - PCI DSS requirement references
- `hipaa_mapping` - HIPAA regulation references
- `gdpr_mapping` - GDPR article references
- `sox_mapping` - SOX section references
- `cobit_mapping` - COBIT framework references
- `cis_controls_mapping` - CIS Controls references
- `cloud_controls_matrix_mapping` - CCM references

**Optional Columns:**
- `scf_version` - SCF version (e.g., "2024.1")
- `control_question` - Assessment question
- `control_answer` - Expected answer
- `implementation_guidance` - How to implement

### Sample Excel Row

| control_id | title | description | domain | is_mcr | nist_csf_mapping | iso_27001_mapping |
|------------|-------|-------------|--------|--------|------------------|-------------------|
| GOV-01 | Statutory, Regulatory & Contractual Compliance | Identify applicable laws, regulations... | Governance | TRUE | ID.GV-3, PR.IP-1 | A.18.1.1, A.18.1.2 |

## Import Methods

### Method 1: CSV Import (Recommended)

**Step 1: Export Excel to CSV**
1. In Excel: File → Save As → CSV (UTF-8)
2. Save as `scf_controls.csv`

**Step 2: Import to Supabase**

Using Supabase Studio:
1. Navigate to Table Editor
2. Select `scf_controls` table
3. Click "Insert" → "Import data from CSV"
4. Upload `scf_controls.csv`
5. Map columns (auto-detection usually works)
6. Click "Import"

**Step 3: Verify Import**

```sql
-- Check imported records
SELECT control_id, title, domain, is_mcr, is_dsr
FROM scf_controls
ORDER BY control_id
LIMIT 10;

-- Count by domain
SELECT domain, COUNT(*) as control_count
FROM scf_controls
GROUP BY domain
ORDER BY domain;
```

### Method 2: SQL INSERT Script

**Step 1: Generate SQL from Excel**

Use this Python script to convert Excel to SQL:

```python
import pandas as pd

# Read Excel file
df = pd.read_excel('scf_controls.xlsx', sheet_name='Controls')

# Generate SQL INSERT statements
with open('import_scf_controls.sql', 'w') as f:
    f.write("-- SCF Controls Import\n")
    f.write("-- Generated from Excel\n\n")
    
    for _, row in df.iterrows():
        # Convert boolean values
        def bool_val(v):
            if pd.isna(v):
                return 'false'
            if isinstance(v, bool):
                return 'true' if v else 'false'
            return 'true' if str(v).upper() in ['Y', 'YES', 'TRUE', '1'] else 'false'
        
        # Escape single quotes
        def sql_str(v):
            if pd.isna(v):
                return 'NULL'
            return f"'{str(v).replace(\"'\", \"''\"))}'"
        
        sql = f"""
INSERT INTO scf_controls (
    control_id, title, description, domain,
    weight, is_material_control, is_mcr, is_dsr,
    applicability_people, applicability_processes, 
    applicability_technology, applicability_data, applicability_facilities,
    nist_csf_mapping, nist_800_53_mapping, iso_27001_mapping,
    iso_27002_mapping, pci_dss_mapping, hipaa_mapping,
    gdpr_mapping, sox_mapping, cobit_mapping,
    cis_controls_mapping, cloud_controls_matrix_mapping,
    scf_version, control_question, implementation_guidance
) VALUES (
    {sql_str(row.get('control_id'))},
    {sql_str(row.get('title'))},
    {sql_str(row.get('description'))},
    {sql_str(row.get('domain'))},
    {row.get('weight', 1.0)},
    {bool_val(row.get('is_material_control'))},
    {bool_val(row.get('is_mcr'))},
    {bool_val(row.get('is_dsr'))},
    {bool_val(row.get('applicability_people'))},
    {bool_val(row.get('applicability_processes'))},
    {bool_val(row.get('applicability_technology'))},
    {bool_val(row.get('applicability_data'))},
    {bool_val(row.get('applicability_facilities'))},
    {sql_str(row.get('nist_csf_mapping'))},
    {sql_str(row.get('nist_800_53_mapping'))},
    {sql_str(row.get('iso_27001_mapping'))},
    {sql_str(row.get('iso_27002_mapping'))},
    {sql_str(row.get('pci_dss_mapping'))},
    {sql_str(row.get('hipaa_mapping'))},
    {sql_str(row.get('gdpr_mapping'))},
    {sql_str(row.get('sox_mapping'))},
    {sql_str(row.get('cobit_mapping'))},
    {sql_str(row.get('cis_controls_mapping'))},
    {sql_str(row.get('cloud_controls_matrix_mapping'))},
    {sql_str(row.get('scf_version'))},
    {sql_str(row.get('control_question'))},
    {sql_str(row.get('implementation_guidance'))}
) ON CONFLICT (control_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();
"""
        f.write(sql)

print("SQL file generated: import_scf_controls.sql")
```

**Step 2: Run SQL Import**

```sql
-- In Supabase Studio SQL Editor
\i import_scf_controls.sql
```

### Method 3: API-Based Import (Node.js)

```typescript
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function importSCFControls(filePath: string) {
  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Importing ${data.length} SCF controls...`);

  // Batch insert (100 at a time)
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map((row: any) => ({
      control_id: row.control_id,
      title: row.title,
      description: row.description,
      domain: row.domain,
      weight: parseFloat(row.weight) || 1.0,
      is_material_control: parseBool(row.is_material_control),
      is_mcr: parseBool(row.is_mcr),
      is_dsr: parseBool(row.is_dsr),
      applicability_people: parseBool(row.applicability_people),
      applicability_processes: parseBool(row.applicability_processes),
      applicability_technology: parseBool(row.applicability_technology),
      applicability_data: parseBool(row.applicability_data),
      applicability_facilities: parseBool(row.applicability_facilities),
      nist_csf_mapping: row.nist_csf_mapping || null,
      nist_800_53_mapping: row.nist_800_53_mapping || null,
      iso_27001_mapping: row.iso_27001_mapping || null,
      iso_27002_mapping: row.iso_27002_mapping || null,
      pci_dss_mapping: row.pci_dss_mapping || null,
      hipaa_mapping: row.hipaa_mapping || null,
      gdpr_mapping: row.gdpr_mapping || null,
      sox_mapping: row.sox_mapping || null,
      cobit_mapping: row.cobit_mapping || null,
      cis_controls_mapping: row.cis_controls_mapping || null,
      cloud_controls_matrix_mapping: row.cloud_controls_matrix_mapping || null,
      scf_version: row.scf_version || null,
      control_question: row.control_question || null,
      implementation_guidance: row.implementation_guidance || null,
    }));

    const { error } = await supabase
      .from('scf_controls')
      .upsert(batch, { onConflict: 'control_id' });

    if (error) {
      console.error(`Error importing batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Imported batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log('Import complete!');
}

function parseBool(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['y', 'yes', 'true', '1'].includes(value.toLowerCase());
  }
  return false;
}

// Run import
importSCFControls('./scf_controls.xlsx');
```

## Post-Import: Create Cross-Reference Mappings

After importing SCF controls with cross-reference data in text columns, create structured mappings:

### Step 1: Extract External Framework Controls

```sql
-- Example: Extract ISO 27001 mappings
-- Assumes iso_27001_mapping contains comma-separated values like "A.5.1.1, A.5.1.2"

-- First, ensure ISO 27001 framework exists
INSERT INTO frameworks (code, name, version, description, framework_type)
VALUES (
  'ISO27001',
  'ISO/IEC 27001:2022',
  '2022',
  'Information security management systems - Requirements',
  'compliance'
) ON CONFLICT (code, version) DO NOTHING;

-- Create external controls from SCF mappings
WITH iso_mappings AS (
  SELECT 
    control_id,
    TRIM(UNNEST(STRING_TO_ARRAY(iso_27001_mapping, ','))) as iso_ref
  FROM scf_controls
  WHERE iso_27001_mapping IS NOT NULL
)
INSERT INTO external_controls (framework_id, ref_code, description)
SELECT 
  (SELECT id FROM frameworks WHERE code = 'ISO27001' LIMIT 1),
  iso_ref,
  'ISO 27001 Control: ' || iso_ref
FROM iso_mappings
WHERE iso_ref != ''
ON CONFLICT (framework_id, ref_code) DO NOTHING;
```

### Step 2: Create SCF Control Mappings

```sql
-- Link SCF controls to ISO 27001 controls
WITH iso_mappings AS (
  SELECT 
    c.id as scf_control_id,
    TRIM(UNNEST(STRING_TO_ARRAY(c.iso_27001_mapping, ','))) as iso_ref
  FROM scf_controls c
  WHERE c.iso_27001_mapping IS NOT NULL
)
INSERT INTO scf_control_mappings (
  scf_control_id,
  external_control_id,
  framework_id,
  mapping_strength,
  confidence
)
SELECT 
  m.scf_control_id,
  ec.id,
  ec.framework_id,
  'full',
  95
FROM iso_mappings m
JOIN external_controls ec ON ec.ref_code = m.iso_ref
WHERE m.iso_ref != ''
  AND ec.framework_id = (SELECT id FROM frameworks WHERE code = 'ISO27001' LIMIT 1)
ON CONFLICT (scf_control_id, external_control_id) DO NOTHING;
```

### Step 3: Repeat for All Frameworks

Create similar scripts for:
- NIST CSF
- NIST 800-53
- ISO 27002
- PCI DSS
- HIPAA
- GDPR
- SOX
- COBIT
- CIS Controls
- Cloud Controls Matrix

## Validation Queries

### Verify Control Import

```sql
-- Total controls by domain
SELECT domain, COUNT(*) as count
FROM scf_controls
GROUP BY domain
ORDER BY count DESC;

-- MCR vs DSR breakdown
SELECT 
  CASE 
    WHEN is_mcr THEN 'MCR'
    WHEN is_dsr THEN 'DSR'
    ELSE 'Unclassified'
  END as classification,
  COUNT(*) as count
FROM scf_controls
GROUP BY classification;

-- PPTDF distribution
SELECT
  SUM(CASE WHEN applicability_people THEN 1 ELSE 0 END) as people,
  SUM(CASE WHEN applicability_processes THEN 1 ELSE 0 END) as processes,
  SUM(CASE WHEN applicability_technology THEN 1 ELSE 0 END) as technology,
  SUM(CASE WHEN applicability_data THEN 1 ELSE 0 END) as data,
  SUM(CASE WHEN applicability_facilities THEN 1 ELSE 0 END) as facilities
FROM scf_controls;
```

### Verify Cross-Reference Mappings

```sql
-- Controls with framework mappings
SELECT 
  COUNT(*) as total_controls,
  SUM(CASE WHEN nist_csf_mapping IS NOT NULL THEN 1 ELSE 0 END) as has_nist_csf,
  SUM(CASE WHEN nist_800_53_mapping IS NOT NULL THEN 1 ELSE 0 END) as has_nist_800_53,
  SUM(CASE WHEN iso_27001_mapping IS NOT NULL THEN 1 ELSE 0 END) as has_iso_27001,
  SUM(CASE WHEN pci_dss_mapping IS NOT NULL THEN 1 ELSE 0 END) as has_pci_dss,
  SUM(CASE WHEN hipaa_mapping IS NOT NULL THEN 1 ELSE 0 END) as has_hipaa,
  SUM(CASE WHEN gdpr_mapping IS NOT NULL THEN 1 ELSE 0 END) as has_gdpr
FROM scf_controls;

-- Structured mappings created
SELECT 
  f.code,
  f.name,
  COUNT(DISTINCT scm.scf_control_id) as scf_controls_mapped,
  COUNT(DISTINCT scm.external_control_id) as external_controls_mapped
FROM scf_control_mappings scm
JOIN frameworks f ON scm.framework_id = f.id
GROUP BY f.code, f.name
ORDER BY scf_controls_mapped DESC;
```

## Troubleshooting

### Issue: Boolean values not importing correctly

**Solution:** Ensure Excel cells contain TRUE/FALSE or convert Y/N to boolean:

```sql
-- Fix after import
UPDATE scf_controls
SET is_mcr = (
  CASE 
    WHEN metadata->>'is_mcr_raw' IN ('Y', 'Yes', 'TRUE', '1') THEN true
    ELSE false
  END
);
```

### Issue: Special characters in descriptions

**Solution:** Ensure CSV is UTF-8 encoded or clean in SQL:

```sql
-- Remove problematic characters
UPDATE scf_controls
SET description = REGEXP_REPLACE(description, '[^\x20-\x7E]', '', 'g')
WHERE description ~ '[^\x20-\x7E]';
```

### Issue: Cross-reference parsing errors

**Solution:** Standardize delimiters before creating mappings:

```sql
-- Standardize to comma-separated
UPDATE scf_controls
SET iso_27001_mapping = REPLACE(REPLACE(iso_27001_mapping, ';', ','), '|', ',')
WHERE iso_27001_mapping ~ '[;|]';
```

## Next Steps After Import

1. **Verify Data Quality**
   - Run validation queries
   - Check for missing required fields
   - Validate cross-references

2. **Create Structured Mappings**
   - Extract framework controls
   - Create scf_control_mappings records
   - Validate bidirectional relationships

3. **Set Up Obligations**
   - Create obligation records for regulations
   - Link requirements to SCF controls
   - Tag MCR controls

4. **Define Maturity Targets**
   - Set organizational target levels
   - Define negligence thresholds
   - Plan assessment schedule

5. **Begin Risk Mapping**
   - Link risks to controls
   - Import threat catalog
   - Set risk appetite

## Additional Resources

- **SCF Official Site**: https://securecontrolsframework.com
- **Excel Template**: Request from SCF or create custom
- **Mapping Documentation**: See `documentation/SCF_IMPLEMENTATION_GUIDE.md`
- **API Reference**: TypeScript types in `frontend/lib/database-scf.types.ts`

---

**Questions or Issues?**
Refer to the full architecture documentation in `documentation/2025.11.18_scf_architecture.md`
