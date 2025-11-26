# Next Steps: SCF Implementation Roadmap

## Immediate Actions (Ready to Execute)

### 1. Apply Database Schema ✅ READY

**What:** Deploy the complete SCF-centric schema to your Supabase instance

**How:**
```bash
# Option A: Supabase Studio (Recommended for first-time)
1. Open Supabase Studio (https://app.supabase.com)
2. Navigate to SQL Editor
3. Open file: apply_schema.sql
4. Click "Run"
5. Verify: Check Tables list shows 41+ new tables

# Option B: Supabase CLI
cd /Volumes/home/Projects/GRC_Unified_Platform
supabase db reset  # If starting fresh
# Or apply specific migration:
supabase migration up
```

**Expected Result:**
- ✅ 41+ tables created
- ✅ All indexes created
- ✅ 3 analytical views created
- ✅ Demo organization inserted

**Validation:**
```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'scf%' 
  OR table_name IN ('obligations', 'requirements', 'risks', 'threats');

-- Should return ~41 tables
```

---

### 2. Import SCF Control Catalog ⏳ YOUR EXCEL FILE

**What:** Import your SCF Excel file into the `scf_controls` table

**Prerequisites:**
- Your SCF Excel file ready
- Schema applied (Step 1 complete)

**Process:**

#### Option A: CSV Import (Easiest)
```bash
# 1. Save Excel as CSV (UTF-8)
File → Save As → scf_controls.csv

# 2. In Supabase Studio:
- Navigate to Table Editor → scf_controls
- Click "Insert" → "Import from CSV"
- Upload scf_controls.csv
- Map columns (auto-detect)
- Click "Import"
```

#### Option B: SQL Script (Python)
```python
# Use provided script in EXCEL_IMPORT_GUIDE.md
python convert_excel_to_sql.py scf_controls.xlsx

# Then in Supabase Studio:
# Paste generated SQL and run
```

#### Option C: Node.js Script
```bash
# See full script in EXCEL_IMPORT_GUIDE.md
npm install @supabase/supabase-js xlsx
node import_scf_controls.js
```

**Expected Result:**
- ✅ 150-400+ SCF controls imported (depends on SCF version)
- ✅ All cross-reference fields populated
- ✅ PPTDF flags set
- ✅ MCR/DSR classifications assigned

**Validation:**
```sql
-- Check import
SELECT COUNT(*) as total_controls FROM scf_controls;

-- By domain
SELECT domain, COUNT(*) FROM scf_controls GROUP BY domain;

-- Cross-references populated
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN nist_csf_mapping IS NOT NULL THEN 1 ELSE 0 END) as with_nist,
  SUM(CASE WHEN iso_27001_mapping IS NOT NULL THEN 1 ELSE 0 END) as with_iso
FROM scf_controls;
```

---

### 3. Create Structured Framework Mappings ⏳ AFTER EXCEL IMPORT

**What:** Convert text-based cross-references into relational mappings

**Process:**

#### Step A: Create Framework Records
```sql
-- ISO 27001
INSERT INTO frameworks (code, name, version, description, framework_type)
VALUES (
  'ISO27001', 'ISO/IEC 27001:2022', '2022',
  'Information security management systems - Requirements', 'compliance'
) ON CONFLICT (code, version) DO NOTHING;

-- NIST CSF
INSERT INTO frameworks (code, name, version, description, framework_type)
VALUES (
  'NIST_CSF', 'NIST Cybersecurity Framework', '2.0',
  'Framework for Improving Critical Infrastructure Cybersecurity', 'security'
) ON CONFLICT (code, version) DO NOTHING;

-- Repeat for: NIST 800-53, PCI DSS, HIPAA, GDPR, SOX, COBIT, CIS, CCM
```

#### Step B: Extract External Controls
```sql
-- Example: ISO 27001 (repeat pattern for each framework)
WITH iso_mappings AS (
  SELECT DISTINCT
    TRIM(UNNEST(STRING_TO_ARRAY(iso_27001_mapping, ','))) as ref_code
  FROM scf_controls
  WHERE iso_27001_mapping IS NOT NULL
)
INSERT INTO external_controls (framework_id, ref_code, description)
SELECT 
  (SELECT id FROM frameworks WHERE code = 'ISO27001' LIMIT 1),
  ref_code,
  'ISO 27001 Annex A Control: ' || ref_code
FROM iso_mappings
WHERE ref_code != ''
ON CONFLICT (framework_id, ref_code) DO NOTHING;
```

#### Step C: Create SCF Mappings
```sql
-- Link SCF to ISO 27001
WITH iso_mappings AS (
  SELECT 
    c.id as scf_control_id,
    TRIM(UNNEST(STRING_TO_ARRAY(c.iso_27001_mapping, ','))) as iso_ref
  FROM scf_controls c
  WHERE c.iso_27001_mapping IS NOT NULL
)
INSERT INTO scf_control_mappings (
  scf_control_id, external_control_id, framework_id,
  mapping_strength, confidence
)
SELECT 
  m.scf_control_id, ec.id, ec.framework_id, 'full', 95
FROM iso_mappings m
JOIN external_controls ec ON ec.ref_code = m.iso_ref
WHERE m.iso_ref != ''
  AND ec.framework_id = (SELECT id FROM frameworks WHERE code = 'ISO27001')
ON CONFLICT (scf_control_id, external_control_id) DO NOTHING;
```

**Expected Result:**
- ✅ 8-12 framework records created
- ✅ 500-2000+ external control records
- ✅ 1000-5000+ mapping relationships

**Validation:**
```sql
SELECT 
  f.code, f.name,
  COUNT(DISTINCT ec.id) as controls,
  COUNT(DISTINCT scm.scf_control_id) as mapped_scf_controls
FROM frameworks f
LEFT JOIN external_controls ec ON f.id = ec.framework_id
LEFT JOIN scf_control_mappings scm ON f.id = scm.framework_id
GROUP BY f.code, f.name
ORDER BY controls DESC;
```

---

### 4. Implement Row-Level Security (RLS) Policies ⏳ BEFORE PRODUCTION

**What:** Enable multi-tenant data isolation

**Process:**

```sql
-- Enable RLS on all tables (already done in schema)
-- Now add policies

-- Example: scf_controls (global read, org-specific for modifications)
CREATE POLICY "SCF controls are readable by all authenticated users"
  ON scf_controls FOR SELECT
  TO authenticated
  USING (true);

-- Example: policy_statements (org-scoped)
CREATE POLICY "Users can view policies in their organization"
  ON policy_statements FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert policies in their organization"
  ON policy_statements FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Repeat pattern for all org-scoped tables
```

**Helper Function:**
```sql
-- Get user's accessible organizations (including children)
CREATE OR REPLACE FUNCTION get_user_orgs()
RETURNS TABLE (org_id uuid) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE org_tree AS (
    -- Base: User's direct memberships
    SELECT om.org_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
    
    UNION
    
    -- Recursive: Child organizations
    SELECT o.id
    FROM organizations o
    INNER JOIN org_tree ot ON o.parent_id = ot.org_id
  )
  SELECT org_tree.org_id FROM org_tree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use in policies
CREATE POLICY "Users access their org hierarchy"
  ON risks FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM get_user_orgs()));
```

---

### 5. Seed Sample Data for Testing ⏳ OPTIONAL

**What:** Add sample organizations, obligations, and risks for testing

**Process:**

```sql
-- Sample Organization Structure
INSERT INTO organizations (id, parent_id, name, org_type) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'Acme Corp', 'parent'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Acme US', 'subsidiary'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Acme EU', 'subsidiary');

-- Sample Obligation: GDPR
INSERT INTO obligations (name, type, jurisdiction, description, source_reference)
VALUES (
  'General Data Protection Regulation',
  'regulatory',
  'EU',
  'EU regulation on data protection and privacy',
  'Regulation (EU) 2016/679'
);

-- Sample Requirements from GDPR
INSERT INTO requirements (obligation_id, statement, category, mandatory_flag)
SELECT 
  id,
  'Organizations must implement appropriate technical and organizational measures',
  'privacy',
  true
FROM obligations WHERE name = 'General Data Protection Regulation';

-- Link to SCF Control
INSERT INTO control_requirements (control_id, requirement_id, mapping_type)
SELECT 
  (SELECT id FROM scf_controls WHERE control_id = 'DAT-01'),
  r.id,
  'full'
FROM requirements r
JOIN obligations o ON r.obligation_id = o.id
WHERE o.name = 'General Data Protection Regulation';

-- Mark control as MCR
UPDATE scf_controls
SET is_mcr = true
WHERE control_id IN (
  SELECT DISTINCT sc.control_id
  FROM scf_controls sc
  JOIN control_requirements cr ON sc.id = cr.control_id
  JOIN requirements r ON cr.requirement_id = r.id
  WHERE r.mandatory_flag = true
);

-- Sample Threat
INSERT INTO threats (name, category, description)
VALUES (
  'Unauthorized Data Access',
  'manmade',
  'Malicious actor gains unauthorized access to sensitive data'
);

-- Sample Risk
INSERT INTO risks (
  org_id, risk_id, title, description, category,
  threat_id, impact_effect, occurrence_likelihood,
  inherent_risk_score, residual_risk_score,
  risk_tolerance_band, status
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'RISK-2025-001',
  'Customer Data Breach',
  'Risk of unauthorized access to customer PII in production database',
  'compliance',
  id,
  8.0, 0.3, 2.4, 0.8,
  'Moderate', 'assessed'
FROM threats WHERE name = 'Unauthorized Data Access';

-- Link risk to controls
INSERT INTO risk_controls (risk_id, control_id, control_effectiveness)
SELECT 
  (SELECT id FROM risks WHERE risk_id = 'RISK-2025-001'),
  id,
  'effective'
FROM scf_controls WHERE control_id IN ('IAC-01', 'IAC-02', 'DAT-01');
```

---

### 6. Set Up Maturity Targets ⏳ BEFORE ASSESSMENTS

**What:** Define target maturity levels for controls

**Process:**

```sql
-- Organization-wide default: L3 (Well Defined)
INSERT INTO maturity_targets (
  org_id, scope_type, target_level, negligence_threshold, rationale
)
SELECT 
  id, 'organization', 'L3', 'L2',
  'Corporate standard: All controls should be well-defined with L2 minimum'
FROM organizations WHERE org_type = 'parent';

-- Higher target for critical controls
INSERT INTO maturity_targets (
  org_id, scope_type, scope_ref_id, target_level, negligence_threshold, rationale
)
SELECT 
  o.id, 'control', sc.id, 'L4', 'L3',
  'Critical control requires quantitative measurement'
FROM organizations o
CROSS JOIN scf_controls sc
WHERE o.org_type = 'parent'
  AND sc.is_material_control = true;
```

---

### 7. Build Initial UI Components ⏳ NEXT PHASE

**What:** Create React components for SCF interaction

**Priority Components:**

1. **SCF Control Browser**
   - List view with filters (domain, PPTDF, MCR/DSR)
   - Search by control_id or title
   - Detail view with relationships

2. **Framework Mapping Visualizer**
   - Show SCF control with mapped external controls
   - Bidirectional navigation

3. **Control Coverage Dashboard**
   - Use `v_control_coverage` view
   - Show policy/standard/procedure linkage
   - Risk and asset associations

4. **Risk Register**
   - List view with inherent/residual risk
   - Filter by category, status, tolerance band
   - Link to mitigating controls

5. **Maturity Gap Dashboard**
   - Use `v_maturity_gaps` view
   - Highlight CRITICAL gaps
   - Track progress over time

**Tech Stack:**
```bash
cd frontend
npm install @tanstack/react-table recharts lucide-react
```

---

## Phase 2: Operational Readiness (Week 2-4)

### 8. Create Assessment Templates

Define assessment objectives for key controls:

```sql
-- Example: IAC-01 Assessment Objectives
INSERT INTO assessment_objectives (control_id, statement, evidence_expected)
SELECT 
  id,
  'Verify access control policies are documented and approved',
  'Policy documents with approval signatures'
FROM scf_controls WHERE control_id = 'IAC-01';
```

### 9. Import Threat Catalog

Add comprehensive threat library:
- MITRE ATT&CK techniques
- Natural disasters
- Supply chain threats
- Insider threats

### 10. Define Risk Appetite

Set organizational risk thresholds:
```sql
-- Example risk bands
UPDATE risks
SET risk_tolerance_band = 
  CASE 
    WHEN residual_risk_score < 1.0 THEN 'Low'
    WHEN residual_risk_score < 3.0 THEN 'Moderate'
    ELSE 'High'
  END;
```

---

## Phase 3: Integration & Automation (Month 2-3)

### 11. API Development
- REST endpoints for control search
- GraphQL for complex queries
- Webhook integration for assessments

### 12. Evidence Collection Automation
- SIEM integration for logging evidence
- Config management tool integration
- Automated screenshot capture

### 13. Reporting Engine
- Generate compliance reports
- Risk heatmaps
- Maturity trends
- Executive dashboards

---

## Success Metrics

Track these KPIs:

- **Coverage**: % of SCF controls with policies/standards
- **Maturity**: Avg maturity level across domains
- **Risk**: Trend of residual risk over time
- **Compliance**: % controls meeting target maturity
- **Assessment**: Time to complete assessment campaigns
- **Remediation**: Avg time to close POA&M tasks

---

## Support & Resources

**Documentation:**
- Architecture: `documentation/2025.11.18_scf_architecture.md`
- Implementation: `documentation/SCF_IMPLEMENTATION_GUIDE.md`
- Excel Import: `documentation/EXCEL_IMPORT_GUIDE.md`

**Schema:**
- Apply Script: `apply_schema.sql`
- Full Schema: `database/scf_schema.sql`
- Migration: `supabase/migrations/20251118000000_scf_centric_schema.sql`

**Types:**
- TypeScript: `frontend/lib/database-scf.types.ts`

**Roadmap:**
- Full Plan: `ToDo.md`

---

## Getting Help

**When you're ready with your Excel file:**
1. Share the column structure
2. Confirm which frameworks are included
3. I'll provide customized import script
4. Validate data after import
5. Create framework mappings

**Questions to answer:**
- What SCF version is your Excel file?
- Which frameworks have mappings in your file?
- Do you need custom PPTDF categorization?
- What's your priority: compliance, risk, or maturity tracking?

---

**Status Check:**

✅ Schema designed  
✅ Types created  
✅ Documentation complete  
⏳ **YOUR TURN: Apply schema & provide Excel file**  
⏳ Import SCF controls  
⏳ Create framework mappings  
⏳ Build UI components  

Let me know when you're ready with the Excel file! 🚀
