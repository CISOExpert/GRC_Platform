# SCF Framework Implementation Guide

## Overview
This guide provides implementation details for working with the SCF-centric data model in the GRC Unified Platform.

## SCF Control Structure

### Control Identification
Each SCF control follows the format: `DOMAIN-##`

**Common SCF Domains:**
- **GOV**: Governance
- **IAC**: Identity & Access Control
- **BCR**: Business Continuity & Disaster Recovery
- **CHG**: Change Management
- **CPL**: Compliance
- **CRY**: Cryptography
- **DAT**: Data Protection & Privacy
- **END**: Endpoint Security
- **HRS**: Human Resources Security
- **IAO**: Identification & Authentication (Organization)
- **IAU**: Identification & Authentication (Users)
- **INC**: Incident Response
- **LOG**: Logging & Monitoring
- **NET**: Network Security
- **PHY**: Physical Security
- **RSK**: Risk Management
- **SEA**: Security Awareness & Training
- **SDP**: Secure Development Practices
- **THR**: Threat Management
- **TPM**: Third-Party Management
- **VUL**: Vulnerability Management
- **WEB**: Web Security

### PPTDF Applicability

Each control can apply to one or more PPTDF categories:

- **People (P)**: Controls governing personnel, roles, training, awareness
- **Processes (P)**: Controls governing workflows, procedures, governance
- **Technology (T)**: Controls governing systems, networks, applications
- **Data (D)**: Controls governing data classification, protection, retention
- **Facilities (F)**: Controls governing physical security, environmental controls

**Example:**
```sql
-- A control that applies to both People and Processes
INSERT INTO scf_controls (
  control_id,
  title,
  domain,
  applicability_people,
  applicability_processes,
  is_mcr
) VALUES (
  'HRS-01',
  'Personnel Screening',
  'Human Resources Security',
  true,  -- Applies to People
  true,  -- Applies to Processes
  true   -- Is a Minimum Compliance Requirement
);
```

### MCR vs DSR Classification

**MCR (Minimum Compliance Requirements):**
- Controls required to satisfy legal, regulatory, or contractual obligations
- Driven by the `obligations` and `requirements` tables
- Failure to implement = compliance violation
- Examples: GDPR requirements, HIPAA controls, SOX IT controls

**DSR (Discretionary Security Requirements):**
- Controls that exceed minimum requirements
- Based on risk appetite and organizational maturity goals
- "Above and beyond" security practices
- Examples: Advanced threat hunting, zero trust architecture, AI/ML security

**Setting MCR/DSR:**
```sql
-- Mark a control as MCR when it's required by regulation
UPDATE scf_controls 
SET is_mcr = true 
WHERE control_id IN (
  SELECT DISTINCT c.control_id
  FROM scf_controls c
  JOIN control_requirements cr ON c.id = cr.control_id
  JOIN requirements r ON cr.requirement_id = r.id
  WHERE r.mandatory_flag = true
);
```

## Working with Maturity Levels (C|P-CMM)

### Maturity Level Definitions

| Level | Name | Description | Characteristics |
|-------|------|-------------|-----------------|
| **L0** | Not Performed | Control not implemented | No evidence of control execution |
| **L1** | Performed Informally | Ad-hoc implementation | Reactive, inconsistent, person-dependent |
| **L2** | Planned & Tracked | Managed at project level | Documented, tracked, repeatable |
| **L3** | Well Defined | Organizational standard | Proactive, consistent, integrated |
| **L4** | Quantitatively Controlled | Measured & controlled | Metrics-driven, predictable outcomes |
| **L5** | Continuously Improving | Optimized | Innovation, automation, adaptation |

### Setting Maturity Targets

```sql
-- Set organization-wide target maturity (L3 for all controls)
INSERT INTO maturity_targets (
  org_id,
  scope_type,
  scope_ref_id,
  target_level,
  negligence_threshold,
  rationale
) VALUES (
  'org-uuid',
  'organization',
  NULL,
  'L3',
  'L2',  -- Anything below L2 is considered negligent
  'Corporate standard: All controls should reach Well Defined maturity'
);

-- Set specific target for critical controls
INSERT INTO maturity_targets (
  org_id,
  scope_type,
  scope_ref_id,
  target_level,
  negligence_threshold,
  rationale
) VALUES (
  'org-uuid',
  'control',
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
  'L4',  -- Higher target for critical IAC control
  'L3',  -- Higher negligence threshold
  'Access control is critical; requires quantitative measurement'
);
```

### Recording Maturity Assessments

```sql
-- Record assessed maturity for a control
INSERT INTO maturity_assessments (
  org_id,
  control_id,
  assessment_id,
  assessed_level,
  evidence_summary,
  reviewer,
  assessment_date
) VALUES (
  'org-uuid',
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
  'assessment-uuid',
  'L3',
  'Control is well-documented with clear procedures. Consistently applied across all systems.',
  'john.doe@company.com',
  CURRENT_DATE
);
```

### Identifying Maturity Gaps

```sql
-- Query the maturity gaps view
SELECT 
  scf_id,
  title,
  domain,
  target_level,
  assessed_level,
  gap_status
FROM v_maturity_gaps
WHERE gap_status IN ('CRITICAL', 'GAP')
ORDER BY 
  CASE gap_status
    WHEN 'CRITICAL' THEN 1
    WHEN 'GAP' THEN 2
  END,
  domain,
  scf_id;
```

## Risk Management (C|P-RMM)

### Risk Scoring

**Formulas:**
- **Inherent Risk** = Impact Effect (IE) × Occurrence Likelihood (OL)
- **Residual Risk** = Inherent Risk adjusted for control effectiveness

**Scoring Scales:**
- IE: 1-10 (1=negligible, 10=catastrophic)
- OL: 0.1-1.0 (0.1=rare, 1.0=certain)

**Example:**
```sql
INSERT INTO risks (
  org_id,
  risk_id,
  title,
  description,
  category,
  impact_effect,
  occurrence_likelihood,
  inherent_risk_score,
  residual_risk_score,
  risk_tolerance_band
) VALUES (
  'org-uuid',
  'RISK-2025-001',
  'Unauthorized Access to Customer Data',
  'Risk of unauthorized individuals gaining access to customer PII',
  'compliance',
  8.0,   -- High impact
  0.3,   -- 30% likelihood
  2.4,   -- 8.0 × 0.3 = 2.4 inherent risk
  0.8,   -- After controls: reduced to 0.8
  'Moderate'
);

-- Link risk to mitigating controls
INSERT INTO risk_controls (risk_id, control_id, control_effectiveness)
VALUES 
  ((SELECT id FROM risks WHERE risk_id = 'RISK-2025-001'),
   (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
   'effective');
```

### Risk Treatment Workflow

```sql
-- 1. Identify and assess risk (above)

-- 2. Management decision on treatment
INSERT INTO risk_treatments (
  risk_id,
  decision,
  justification,
  approval_level,
  approver,
  effective_date,
  planned_actions
) VALUES (
  (SELECT id FROM risks WHERE risk_id = 'RISK-2025-001'),
  'reduce',  -- Options: reduce, avoid, transfer, accept
  'Implement MFA and enhanced access logging to reduce risk to acceptable levels',
  'Director',
  'jane.smith@company.com',
  CURRENT_DATE,
  'Deploy MFA solution; Implement SIEM for access monitoring'
);

-- 3. Create POA&M tasks for remediation
INSERT INTO poam_tasks (
  org_id,
  treatment_id,
  control_id,
  title,
  description,
  owner,
  due_date,
  priority
) VALUES (
  'org-uuid',
  (SELECT id FROM risk_treatments WHERE risk_id = (SELECT id FROM risks WHERE risk_id = 'RISK-2025-001')),
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-02'),
  'Deploy Multi-Factor Authentication',
  'Roll out MFA to all user accounts across all systems',
  'security.team@company.com',
  CURRENT_DATE + INTERVAL '90 days',
  'critical'
);
```

## Assessment Workflow

### 1. Create Assessment Campaign

```sql
INSERT INTO assessments (
  org_id,
  name,
  description,
  scope_description,
  rigor_level,
  start_date,
  end_date,
  assessor_type
) VALUES (
  'org-uuid',
  'Q4 2025 Compliance Assessment',
  'Quarterly assessment of all MCR controls',
  'All systems in production environment',
  'L2',  -- Enhanced rigor
  '2025-10-01',
  '2025-12-31',
  '3PA'  -- Third-party assessor
);
```

### 2. Define Assessment Objectives

```sql
INSERT INTO assessment_objectives (
  control_id,
  statement,
  evidence_expected
) VALUES (
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
  'Verify that access control policies are documented, approved, and communicated',
  'Policy documents, approval records, training records'
);
```

### 3. Collect Evidence

```sql
INSERT INTO evidence_items (
  assessment_id,
  ao_id,
  evidence_type,
  location,
  reviewer,
  review_date,
  notes
) VALUES (
  'assessment-uuid',
  'ao-uuid',
  'document',
  's3://evidence-bucket/policies/access-control-policy-v2.pdf',
  'auditor@thirdparty.com',
  CURRENT_DATE,
  'Policy dated 2025-01-15, approved by CISO'
);
```

### 4. Record Findings

```sql
INSERT INTO findings (
  assessment_id,
  control_id,
  severity,
  description,
  recommended_action,
  status
) VALUES (
  'assessment-uuid',
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
  'significant_deficiency',
  'Access control policy exists but has not been reviewed in 18 months, exceeding the 12-month review requirement',
  'Update policy and establish recurring review calendar',
  'open'
);

-- Link finding to POA&M
INSERT INTO poam_tasks (
  org_id,
  finding_id,
  control_id,
  title,
  owner,
  due_date,
  priority
) VALUES (
  'org-uuid',
  'finding-uuid',
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
  'Review and Update Access Control Policy',
  'policy.owner@company.com',
  CURRENT_DATE + INTERVAL '30 days',
  'high'
);
```

### 5. Generate Conformity Report

```sql
INSERT INTO conformity_reports (
  assessment_id,
  org_id,
  control_id,
  conformity_status,
  summary,
  report_date
) VALUES (
  'assessment-uuid',
  'org-uuid',
  (SELECT id FROM scf_controls WHERE control_id = 'IAC-01'),
  'conforms',  -- Options: strictly_conforms, conforms, significant_deficiency, material_weakness
  'Control is implemented and operating effectively with minor deficiencies noted',
  CURRENT_DATE
);
```

## Mapping External Frameworks to SCF

### 1. Add External Framework

```sql
INSERT INTO frameworks (code, name, version, description)
VALUES (
  'ISO27001',
  'ISO/IEC 27001:2022',
  '2022',
  'Information security management systems - Requirements'
);
```

### 2. Add External Control Requirements

```sql
INSERT INTO external_controls (framework_id, ref_code, description)
VALUES (
  (SELECT id FROM frameworks WHERE code = 'ISO27001'),
  'A.5.1',
  'Policies for information security'
);
```

### 3. Map to SCF Controls

```sql
INSERT INTO scf_control_mappings (
  scf_control_id,
  external_control_id,
  framework_id,
  mapping_strength,
  confidence,
  notes
) VALUES (
  (SELECT id FROM scf_controls WHERE control_id = 'GOV-01'),
  (SELECT id FROM external_controls WHERE ref_code = 'A.5.1' AND framework_id = (SELECT id FROM frameworks WHERE code = 'ISO27001')),
  (SELECT id FROM frameworks WHERE code = 'ISO27001'),
  'full',  -- Options: full, partial, related
  95,
  'Direct mapping: SCF GOV-01 fully satisfies ISO 27001 A.5.1'
);
```

## Best Practices

### 1. Control Weighting
Weight critical controls higher for prioritization:
```sql
UPDATE scf_controls 
SET weight = 2.0, is_material_control = true
WHERE control_id IN ('IAC-01', 'IAC-02', 'CRY-01', 'DAT-01');
```

### 2. Bulk Operations
Use CTEs for bulk operations:
```sql
-- Mark all controls related to PCI-DSS as MCR
WITH pci_requirements AS (
  SELECT DISTINCT cr.control_id
  FROM control_requirements cr
  JOIN requirements r ON cr.requirement_id = r.id
  JOIN obligations o ON r.obligation_id = o.id
  WHERE o.name LIKE '%PCI DSS%'
)
UPDATE scf_controls
SET is_mcr = true
WHERE id IN (SELECT control_id FROM pci_requirements);
```

### 3. Reporting Queries
```sql
-- Executive risk dashboard
SELECT 
  r.category,
  COUNT(*) as risk_count,
  AVG(r.residual_risk_score) as avg_residual_risk,
  SUM(CASE WHEN r.residual_risk_score > r.risk_threshold THEN 1 ELSE 0 END) as above_threshold
FROM risks r
WHERE r.org_id = 'org-uuid'
  AND r.status = 'assessed'
GROUP BY r.category
ORDER BY avg_residual_risk DESC;
```

## Common Queries

See `database/scf_schema.sql` for pre-built views:
- `v_control_coverage`: Control implementation status
- `v_risk_exposure`: Risk register summary
- `v_maturity_gaps`: Maturity gap analysis

## Next Steps

1. Populate SCF control catalog (consider importing official SCF JSON/CSV)
2. Define organizational maturity targets
3. Import applicable obligations and requirements
4. Map existing policies to SCF controls
5. Begin first assessment campaign
