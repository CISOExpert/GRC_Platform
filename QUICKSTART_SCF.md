# SCF-Centric Architecture - Quick Reference

## Summary of Changes (November 18, 2025)

The GRC Unified Platform has been completely redesigned to use the **Secure Controls Framework (SCF)** as the central hub, implementing the full **Integrated Controls Management (ICM)** model with **C|P-RMM** and **C|P-CMM**.

## What Changed

### Before (Generic Framework Model)
- Generic "frameworks" and "regulations" tables
- Peer-to-peer framework crosswalks
- No maturity tracking
- Basic risk model
- No assessment workflow
- No asset management

### After (SCF-Centric Model)
- ✅ **41+ tables** implementing complete SCF ecosystem
- ✅ **SCF controls** as central hub
- ✅ **PPTDF model** (People/Process/Technology/Data/Facility)
- ✅ **MCR/DSR** classification (Minimum Compliance vs Discretionary)
- ✅ **C|P-CMM** maturity levels L0-L5 with negligence thresholds
- ✅ **C|P-RMM** 17-step risk management process
- ✅ **Assessment framework** with AO/ERL/Findings
- ✅ **Three-tier documentation** (Policies/Standards/Procedures)
- ✅ **Asset management** with PPTDF categorization
- ✅ **Risk treatment** & POA&M tracking
- ✅ **External framework mappings** TO SCF (unidirectional)

## Key Files Created/Updated

### Database Schema
- **`database/scf_schema.sql`** - Complete SCF-centric schema (41+ tables)
- **`supabase/migrations/20251118000000_scf_centric_schema.sql`** - Migration file

### TypeScript Types
- **`frontend/lib/database-scf.types.ts`** - Comprehensive type definitions

### Documentation
- **`documentation/2025.11.18_scf_architecture.md`** - Complete architecture documentation
- **`documentation/SCF_IMPLEMENTATION_GUIDE.md`** - Practical implementation guide
- **`README.md`** - Updated with SCF-centric description
- **`ToDo.md`** - Updated roadmap with SCF phases

## Core Concepts

### 1. SCF Controls (Central Hub)
```
SCF Controls
    ├── Obligations & Requirements (MCR/DSR drivers)
    ├── External Framework Mappings (ISO, NIST, SOC2, PCI)
    ├── Policies, Standards, Procedures
    ├── Assets (PPTDF-categorized)
    ├── Risks & Threats
    ├── Assessments & Evidence
    ├── Maturity Ratings (L0-L5)
    └── Findings & POA&M
```

### 2. PPTDF Model
Every control and asset is categorized by:
- **People** (P) - Personnel, roles, training
- **Processes** (P) - Workflows, governance
- **Technology** (T) - Systems, networks
- **Data** (D) - Information assets
- **Facilities** (F) - Physical infrastructure

### 3. MCR vs DSR
- **MCR (Minimum Compliance Requirements)** - Legally/regulatorily required
- **DSR (Discretionary Security Requirements)** - "Above and beyond"

### 4. Maturity Levels (C|P-CMM)
- **L0** - Not Performed
- **L1** - Performed Informally
- **L2** - Planned & Tracked
- **L3** - Well Defined
- **L4** - Quantitatively Controlled
- **L5** - Continuously Improving

### 5. Risk Scoring (C|P-RMM)
- **IE (Impact Effect)** × **OL (Occurrence Likelihood)** = **Inherent Risk**
- **Residual Risk** = Inherent Risk after controls applied
- **Risk Treatment**: Reduce, Avoid, Transfer, Accept

## Database Structure

### Core Tables (10 groups)

**1. SCF Controls**
- `scf_controls` - Central control catalog

**2. Obligations**
- `obligations` - Laws, regulations, contracts
- `requirements` - Specific clauses
- `control_requirements` - Requirement-to-control mappings

**3. External Frameworks**
- `frameworks` - External framework catalog
- `external_controls` - Framework control requirements
- `scf_control_mappings` - Maps external TO SCF

**4. Documentation**
- `policy_statements` - High-level policies
- `standard_statements` - Specific standards
- `procedures` - Step-by-step procedures
- `control_policies`, `control_standards`, `control_procedures` - Linkage tables

**5. Assets**
- `assets` - PPTDF-categorized assets
- `asset_controls` - Asset-to-control linkage

**6. Risk Management**
- `threats` - Threat catalog
- `risks` - Risk catalog with scoring
- `risk_controls` - Risk-to-control linkage

**7. Incidents**
- `incidents` - Security/privacy incidents
- `incident_controls` - Incident-to-control linkage

**8. Maturity**
- `maturity_targets` - Target maturity levels
- `maturity_assessments` - Assessed maturity

**9. Assessments**
- `assessments` - Assessment campaigns
- `assessment_objectives` - What to check (AOs)
- `evidence_items` - Evidence collected (ERL)
- `findings` - Assessment results
- `conformity_reports` - Compliance status

**10. Treatment & Remediation**
- `risk_treatments` - Risk treatment decisions
- `poam_tasks` - Remediation tasks

### Views (3)
- `v_control_coverage` - Control implementation coverage
- `v_risk_exposure` - Risk register summary
- `v_maturity_gaps` - Maturity gap analysis

## Enums & Types

**Maturity**: L0, L1, L2, L3, L4, L5  
**Obligation**: statutory, regulatory, contractual  
**Asset Type**: people, process, technology, data, facility  
**Risk Category**: strategic, operational, compliance, financial, reputational, technology, third_party  
**Threat Category**: natural, manmade  
**Risk Treatment**: reduce, avoid, transfer, accept  
**Assessment Rigor**: L1 (Standard), L2 (Enhanced), L3 (Comprehensive)  
**Finding Severity**: observation, significant_deficiency, material_weakness  
**Conformity Status**: strictly_conforms, conforms, significant_deficiency, material_weakness  

## Implementation Workflow

### 1. Populate SCF Controls
Import official SCF catalog with PPTDF tags

### 2. Define Obligations
Add laws, regulations, contracts

### 3. Map Requirements
Break obligations into requirements → map to SCF controls

### 4. Set Maturity Targets
Define target maturity (L0-L5) per control/domain

### 5. Identify Risks
Create risk catalog linked to threats and controls

### 6. Run Assessments
Execute assessment campaigns with evidence collection

### 7. Track Findings
Record deficiencies and create POA&M tasks

### 8. Treat Risks
Management decisions on risk treatment

### 9. Monitor & Improve
Track maturity gaps, risk trends, POA&M progress

## ICM PDCA Loop

**Plan** → Define controls, set targets, establish policies  
**Do** → Implement controls, assign ownership  
**Check** → Run assessments, measure maturity, score risks  
**Act** → Remediate findings, improve processes

## Next Steps

1. ✅ Schema designed (COMPLETE)
2. ✅ TypeScript types created (COMPLETE)
3. ✅ Documentation written (COMPLETE)
4. ⏳ Apply schema to Supabase
5. ⏳ Implement RLS policies
6. ⏳ Import SCF control catalog
7. ⏳ Build UI components
8. ⏳ Populate seed data

## Resources

- **Full Architecture**: `documentation/2025.11.18_scf_architecture.md`
- **Implementation Guide**: `documentation/SCF_IMPLEMENTATION_GUIDE.md`
- **Schema**: `database/scf_schema.sql`
- **Types**: `frontend/lib/database-scf.types.ts`
- **Roadmap**: `ToDo.md`

## Support

For questions about the SCF framework:
- Visit: https://securecontrolsframework.com
- Review the reference material in `reference_material/CSF_Framework_Overview_v1`

---
**Last Updated**: November 18, 2025
