# Future Add-On: NICE Framework Integration

**Status**: Planned (Not Yet Implemented)
**Priority**: Low
**Documented**: 2025-11-29
**Source Files**: `reference_material/NICE Framework Components v1.0.0.xlsx`, `reference_material/ConsolidatedNICEFramework_Full_LIst.xlsx`

---

## Overview

The NICE Framework (NIST SP 800-181r1 - Workforce Framework for Cybersecurity) defines the cybersecurity workforce through work roles, competencies, and task/knowledge/skill (TKS) statements. Unlike compliance frameworks (ISO 27001, NIST CSF), NICE focuses on **who** does the work rather than **what** controls to implement.

Integrating NICE would enable workforce competency management tied to control implementation.

---

## Framework Structure (v1.0.0 - March 2024)

### Components Summary

| Component | Count | Description |
|-----------|-------|-------------|
| Work Role Categories | 7 | High-level workforce groupings |
| Work Roles | 52 | Specific job functions |
| TKS Statements | 2,280 | Tasks (1,084), Knowledge (640), Skills (556) |
| Competency Areas | 11 | Learning capability domains |

### Work Role Categories

| Code | Category | Roles |
|------|----------|-------|
| OG | Oversight & Governance | 16 |
| DD | Design & Development | 8 |
| IO | Implementation & Operation | 7 |
| PD | Protection & Defense | 7 |
| IN | Investigation | 2 |
| CI | Cyberspace Intelligence | 5 |
| CE | Cyberspace Operations | 7 |

### Work Roles (52 Total)

| ID | Category | Role Name | OPM Code |
|----|----------|-----------|----------|
| OG-WRL-001 | Oversight & Governance | Communications Security (COMSEC) Management | 723 |
| OG-WRL-002 | Oversight & Governance | Cybersecurity Policy and Planning | 752 |
| OG-WRL-003 | Oversight & Governance | Cybersecurity Workforce Management | 751 |
| OG-WRL-004 | Oversight & Governance | Cybersecurity Curriculum Development | 711 |
| OG-WRL-005 | Oversight & Governance | Cybersecurity Instruction | 712 |
| OG-WRL-006 | Oversight & Governance | Cybersecurity Legal Advice | 731 |
| OG-WRL-007 | Oversight & Governance | Executive Cybersecurity Leadership | 901 |
| OG-WRL-008 | Oversight & Governance | Privacy Compliance | 732 |
| OG-WRL-009 | Oversight & Governance | Product Support Management | 803 |
| OG-WRL-010 | Oversight & Governance | Program Management | 801 |
| OG-WRL-011 | Oversight & Governance | Secure Project Management | 802 |
| OG-WRL-012 | Oversight & Governance | Security Control Assessment | 612 |
| OG-WRL-013 | Oversight & Governance | Systems Authorization | 611 |
| OG-WRL-014 | Oversight & Governance | Systems Security Management | 722 |
| OG-WRL-015 | Oversight & Governance | Technology Portfolio Management | 804 |
| OG-WRL-016 | Oversight & Governance | Technology Program Auditing | 805 |
| DD-WRL-001 | Design & Development | Cybersecurity Architecture | 652 |
| DD-WRL-002 | Design & Development | Enterprise Architecture | 651 |
| DD-WRL-003 | Design & Development | Secure Software Development | 621 |
| DD-WRL-004 | Design & Development | Secure Systems Development | 631/632 |
| DD-WRL-005 | Design & Development | Software Security Assessment | 622 |
| DD-WRL-006 | Design & Development | Systems Requirements Planning | 641 |
| DD-WRL-007 | Design & Development | Systems Testing and Evaluation | 671 |
| DD-WRL-008 | Design & Development | Technology Research and Development | 661 |
| IO-WRL-001 | Implementation & Operation | Data Analysis | 422 |
| IO-WRL-002 | Implementation & Operation | Database Administration | 421 |
| IO-WRL-003 | Implementation & Operation | Knowledge Management | 431 |
| IO-WRL-004 | Implementation & Operation | Network Operations | 441 |
| IO-WRL-005 | Implementation & Operation | Systems Administration | 451 |
| IO-WRL-006 | Implementation & Operation | Systems Security Analysis | 461 |
| IO-WRL-007 | Implementation & Operation | Technical Support | 411 |
| PD-WRL-001 | Protection & Defense | Defensive Cybersecurity | 511 |
| PD-WRL-002 | Protection & Defense | Digital Forensics | 212 |
| PD-WRL-003 | Protection & Defense | Incident Response | 531 |
| PD-WRL-004 | Protection & Defense | Infrastructure Support | 521 |
| PD-WRL-005 | Protection & Defense | Insider Threat Analysis | TBD |
| PD-WRL-006 | Protection & Defense | Threat Analysis | 141 |
| PD-WRL-007 | Protection & Defense | Vulnerability Analysis | 541 |
| IN-WRL-001 | Investigation | Cybercrime Investigation | 221 |
| IN-WRL-002 | Investigation | Digital Evidence Analysis | 211 |
| CI-WRL-001 | Cyberspace Intelligence | All-Source Analysis | 111 |
| CI-WRL-002 | Cyberspace Intelligence | All-Source Collection Management | 311 |
| CI-WRL-003 | Cyberspace Intelligence | All-Source Collection Requirements Management | 312 |
| CI-WRL-004 | Cyberspace Intelligence | Cyber Intelligence Planning | 331 |
| CI-WRL-005 | Cyberspace Intelligence | Multi-Disciplined Language Analysis | 151 |
| CE-WRL-001 | Cyberspace Operations | Cyberspace Operations | 321 |
| CE-WRL-002 | Cyberspace Operations | Cyber Operations Planning | 332 |
| CE-WRL-003 | Cyberspace Operations | Exploitation Analysis | 121 |
| CE-WRL-004 | Cyberspace Operations | Mission Assessment | 112 |
| CE-WRL-005 | Cyberspace Operations | Partner Integration Planning | 333 |
| CE-WRL-006 | Cyberspace Operations | Target Analysis | 131 |
| CE-WRL-007 | Cyberspace Operations | Target Network Analysis | 132 |

### TKS Statement Types

| Prefix | Type | Count | Example |
|--------|------|-------|---------|
| K | Knowledge | 640 | K0018: "Knowledge of encryption algorithms" |
| S | Skill | 556 | S0011: "Skill in conducting information searches" |
| T | Task | 1,084 | T0006: "Advocate organization's official position in legal and legislative proceedings" |

### Competency Areas (11 Total)

| ID | Name | Description |
|----|------|-------------|
| NF-COM-001 | Access Controls | Define, manage, monitor secure access privileges |
| NF-COM-002 | AI Security | Secure AI systems and mitigate AI threats |
| NF-COM-003 | Asset Management | Inventory and lifecycle management of digital assets |
| NF-COM-004 | Cloud Security | Protect cloud data, applications, infrastructure |
| NF-COM-005 | Communications Security | Secure transmissions and network infrastructure |
| NF-COM-006 | Cryptography | Transform data using cryptographic processes |
| NF-COM-007 | Cyber Resiliency | Anticipate, withstand, recover from cyber attacks |
| NF-COM-008 | DevSecOps | Integrate security throughout DevOps lifecycle |
| NF-COM-009 | OS Security | Install, administer, secure operating systems |
| NF-COM-010 | OT Security | Secure operational technology systems |
| NF-COM-011 | Supply Chain Security | Analyze and control third-party technology risks |

---

## Integration Value Proposition

| Feature | Benefit |
|---------|---------|
| Control-to-Role Mapping | Know who should implement each SCF control |
| Competency Gap Analysis | Identify training needs per control domain |
| Workforce Planning | Size security teams based on control requirements |
| Job Descriptions | Auto-generate role requirements from controls |
| Maturity + Workforce | Assess both control AND workforce maturity |
| Risk Context | Understand workforce risks to control implementation |

---

## Proposed Database Schema

```sql
-- ============================================================================
-- NICE Framework Integration Tables
-- ============================================================================

-- Work Role Categories (7 categories)
CREATE TABLE nice_work_role_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,        -- OG, DD, IO, PD, IN, CI, CE
  name TEXT NOT NULL,               -- "Oversight and Governance"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Roles (52 roles)
CREATE TABLE nice_work_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_role_id TEXT NOT NULL UNIQUE,  -- OG-WRL-001
  category_id UUID REFERENCES nice_work_role_categories(id),
  name TEXT NOT NULL,                  -- "Communications Security (COMSEC) Management"
  description TEXT,
  opm_code TEXT,                       -- Federal OPM job code (723, 752, etc.)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TKS Statements (2,280 statements)
CREATE TABLE nice_tks_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tks_id TEXT NOT NULL UNIQUE,        -- K0018, S0011, T0006
  type TEXT NOT NULL,                  -- 'knowledge', 'skill', 'task'
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Role to TKS Mapping (many-to-many)
CREATE TABLE nice_work_role_tks (
  work_role_id UUID REFERENCES nice_work_roles(id) ON DELETE CASCADE,
  tks_id UUID REFERENCES nice_tks_statements(id) ON DELETE CASCADE,
  PRIMARY KEY (work_role_id, tks_id)
);

-- Competency Areas (11 areas)
CREATE TABLE nice_competency_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id TEXT NOT NULL UNIQUE,  -- NF-COM-001
  name TEXT NOT NULL,                   -- "Access Controls"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SCF Control to NICE Workforce Mapping
-- ============================================================================

-- Map controls to work roles (who implements this control?)
CREATE TABLE control_work_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  work_role_id UUID REFERENCES nice_work_roles(id) ON DELETE CASCADE,
  responsibility_type TEXT,  -- 'primary', 'supporting', 'consulted', 'informed' (RACI)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, work_role_id)
);

-- Map controls to required TKS statements
CREATE TABLE control_tks_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES scf_controls(id) ON DELETE CASCADE,
  tks_id UUID REFERENCES nice_tks_statements(id) ON DELETE CASCADE,
  requirement_level TEXT,  -- 'essential', 'beneficial', 'advanced'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, tks_id)
);

-- ============================================================================
-- Organization Workforce Management
-- ============================================================================

-- Organization staff/positions
CREATE TABLE org_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  work_role_id UUID REFERENCES nice_work_roles(id),  -- NICE classification
  incumbent_name TEXT,
  fte_count NUMERIC(3,1) DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track individual competency assessments
CREATE TABLE workforce_competency_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  position_id UUID REFERENCES org_positions(id) ON DELETE CASCADE,
  tks_id UUID REFERENCES nice_tks_statements(id) ON DELETE CASCADE,
  proficiency_level TEXT,  -- 'none', 'basic', 'intermediate', 'advanced', 'expert'
  assessed_date DATE,
  assessor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_nice_work_roles_category ON nice_work_roles(category_id);
CREATE INDEX idx_nice_tks_type ON nice_tks_statements(type);
CREATE INDEX idx_control_work_roles_control ON control_work_roles(control_id);
CREATE INDEX idx_control_work_roles_role ON control_work_roles(work_role_id);
CREATE INDEX idx_control_tks_control ON control_tks_requirements(control_id);
CREATE INDEX idx_org_positions_org ON org_positions(org_id);
CREATE INDEX idx_workforce_competency_org ON workforce_competency_assessments(org_id);
```

---

## Implementation Phases

### Phase 1: Core NICE Data Import
- Import 7 categories, 52 work roles, 2,280 TKS statements
- Import 11 competency areas
- Build work role to TKS relationships from source data

### Phase 2: Control-Workforce Mapping
- Create control to work role mappings (manual or AI-assisted)
- Create control to TKS requirement mappings
- UI for viewing/editing mappings

### Phase 3: Organization Workforce Module
- Org positions management
- Competency assessments
- Gap analysis dashboards
- Training needs reports

---

## UI Components (Proposed)

1. **Workforce Explorer** - Browse work roles, categories, TKS statements
2. **Control Workforce View** - See which roles/competencies a control requires
3. **Org Positions Management** - Manage staff positions with NICE classifications
4. **Competency Assessment** - Track individual TKS proficiency
5. **Gap Analysis Dashboard** - Controls without qualified workforce coverage
6. **Training Needs Report** - TKS gaps aggregated by role/department

---

## References

- [NICE Framework Resource Center](https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center)
- [NIST SP 800-181r1](https://csrc.nist.gov/publications/detail/sp/800-181/rev-1/final)
- [NICCS (CISA)](https://niccs.cisa.gov/workforce-development/nice-framework)
- Source files in `reference_material/`

---

## Notes

- The consolidated file (`ConsolidatedNICEFramework_Full_LIst.xlsx`) only contains Knowledge statements (613 unique K-statements mapped to 52 work roles = 3,777 rows)
- The full file (`NICE Framework Components v1.0.0.xlsx`) contains all 2,280 TKS statements plus per-role sheets
- OPM codes link to federal job classification system
- Competency Areas are new in v1.0.0 (March 2024) - TKS mappings for competencies are still in development by NIST
