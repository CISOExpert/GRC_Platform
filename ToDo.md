# GRC Unified Platform - Roadmap & Tasks

## Technology Stack - Library Decisions (Added 2025.11.19)

### ✅ Current Dependencies
- `next` (v16) - App Router framework
- `@supabase/supabase-js` - Database & Auth client
- `@tanstack/react-table` (v8) - Data grids (in use on framework mappings)
- `lucide-react` - Icon library
- `tailwindcss` + `shadcn/ui` - Component library

### 🔨 Phase 1A: Critical Additions (COMPLETED - Nov 19, 2025)
- [x] `@tanstack/react-query` - Server state caching (CRITICAL for saved views)
- [x] `@tanstack/react-query-devtools` - Development tools
- [x] `date-fns` - Date formatting
- [x] `ltree` PostgreSQL extension - Hierarchical control queries
- [x] **Fixed migration conflict** - organization_frameworks view column names
- [x] **Fixed missing function** - update_updated_at_column() added to saved_views migration
- [x] **Applied all migrations** - organization_frameworks, saved_views, ltree
- [x] **Setup React Query** - QueryProvider with devtools
- [x] **Created query utilities** - Query keys and invalidation hooks

### ✅ Phase 1B: Framework Mapping Fixes (COMPLETED - Nov 25, 2025)
- [x] **Fixed framework header mismatch** - 84 frameworks had newline vs space formatting issues
- [x] **Updated all framework headers** - Corrected mapping_column_header to match Excel format
- [x] **Re-imported all framework mappings** - Increased from 1,994 → 12,029 mappings (6x increase)
- [x] **Added framework search** - Filter panel now has search functionality
- [x] **Added sort by selection** - Selected frameworks float to top of filter list
- [x] **Verified major frameworks** - ISO 27001/27002, PCI DSS, CIS, SOC 2, COBIT all working
- [x] **91 of 130 frameworks** now have mappings (70% coverage)
- [x] **1,293 of 1,420 SCF controls** have mappings (91% coverage)

### 📋 Phase 2: Data Exploration (Weeks 2-6)
- [ ] `recharts` - Add when first chart needed
- [ ] `zustand` - UI state (use sparingly)

### 📋 Phase 3+: Advanced Features (DEFERRED)
- [ ] `react-grid-layout` - Drag-drop dashboards (defer - use static dashboards first)
- [ ] `@dnd-kit/core` - Kanban boards (defer)
- [ ] `reactflow` - Process diagrams (defer to Phase 4)
- [ ] `d3-hierarchy` - Tree visualization (only if needed)
- [ ] `diff` - Audit log visual diff (defer)

---

## Phase 1: SCF-Centric Foundation ✅ MOSTLY COMPLETE

### Core Setup ✅
- [x] Initialize Next.js 16 (TypeScript, Tailwind, App Router) in `frontend/`
- [x] Install core client libs: `@supabase/supabase-js`, `@tanstack/react-table`, `lucide-react`
- [x] Setup Supabase project (local CLI) & environment variables
- [x] Add base layout, navigation shell, theme tokens
- [x] Implement auth (email/password) + role assignment (admin, manager)
- [x] Framework mapping explorer with saved views (2025.11.19)

### Phase 1A: Critical Foundation (✅ COMPLETED - Nov 19, 2025)
- [x] **Fix migration conflict** - 20251119000001_add_organization_frameworks.sql
- [x] **Create ltree migration** - 20251119000003_add_ltree.sql (existed, now applied)
- [x] **Install dependencies** - `npm install @tanstack/react-query @tanstack/react-query-devtools date-fns`
- [x] **Apply migrations** - `supabase db reset` (all 4 migrations applied successfully)
- [x] **Setup React Query** - Created QueryClientProvider wrapper with devtools
- [x] **Created query hooks** - Query keys and invalidation utilities

### Phase 1B: Framework Mapping System (✅ COMPLETED - Nov 25, 2025)
- [x] **Fixed framework header formatting** - Corrected 84 frameworks with newline issues
- [x] **Re-imported all mappings** - 12,029 mappings across 91 frameworks
- [x] **Framework filter enhancements** - Added search and selected-first sorting
- [ ] **Add control counts to framework filters** - Show (count) next to each framework name
- [ ] **Test saved views** - Verify cache invalidation works

### SCF-Centric Data Model ✅
- [x] Create complete SCF-centric schema (41+ tables)
- [x] `scf_controls` table with PPTDF and MCR/DSR classification
- [x] `obligations`, `requirements`, `control_requirements` for legal/regulatory drivers
- [x] `external_controls`, `scf_control_mappings` for framework mappings TO SCF
- [x] `policy_statements`, `standard_statements`, `procedures` three-tier documentation
- [x] `assets` with PPTDF categorization
- [x] `threats`, `risks`, `risk_controls` for C|P-RMM implementation
- [x] `maturity_targets`, `maturity_assessments` for C|P-CMM L0-L5 tracking
- [x] `assessments`, `assessment_objectives`, `evidence_items`, `findings` for assessment workflow
- [x] `risk_treatments`, `poam_tasks` for risk management
- [x] Analytical views: control_coverage, risk_exposure, maturity_gaps
- [x] Complete TypeScript types for all entities
- [x] Architecture documentation

### Multi-Tenancy & Organization ✅
- [x] `organizations` table (self-referencing hierarchy)
- [x] `users` + `organization_members` tables
- [ ] Implement RLS policies (scoped by active org id + role)
- [ ] Organization context selector component
- [ ] Seed script for sample nested orgs

### Tooling & Quality
- [x] Add ESLint + Prettier config
- [ ] Add Vitest test harness
- [ ] Add Playwright baseline (later, after initial pages)
- [ ] Basic CI pipeline (lint + test) placeholder

## Phase 2: SCF Data Population & Core UI

### SCF Control Catalog
- [ ] Import official SCF control catalog (JSON/CSV)
- [ ] Seed PPTDF applicability flags per control
- [ ] Set control weights and materiality flags
- [ ] Tag controls with SCF domains

### Obligations & Requirements
- [ ] Create obligation templates (GDPR, HIPAA, SOX, PCI-DSS, etc.)
- [ ] Break down obligations into requirements
- [ ] Map requirements to SCF controls
- [ ] Tag MCR-driving requirements
- [ ] UI for obligation management

### External Framework Mappings
- [ ] Import ISO 27001 control catalog
- [ ] Import NIST CSF control catalog
- [ ] Import SOC2 control catalog
- [ ] Import PCI-DSS control catalog
- [ ] Create SCF mappings for each framework
- [ ] UI for framework mapping visualization

### Core SCF UI Components
- [ ] SCF control browser/search
- [ ] Control detail view with relationships
- [ ] PPTDF filter interface
- [ ] MCR/DSR classification UI
- [ ] Control coverage dashboard
- [ ] Framework mapping visualizer

## Phase 3: Risk & Maturity Management

### Maturity (C|P-CMM)
- [ ] Maturity target setting UI
- [ ] Maturity assessment form
- [ ] Maturity gap dashboard
- [ ] Negligence threshold alerts
- [ ] Domain-level maturity rollup
- [ ] Maturity trend tracking

### Risk Management (C|P-RMM)
- [ ] Risk catalog UI
- [ ] Risk assessment form with IE/OL scoring
- [ ] Inherent vs residual risk calculation
- [ ] Risk-to-control linking interface
- [ ] Risk treatment decision workflow
- [ ] Risk exposure dashboard
- [ ] Risk heatmap visualization

### Threat Management
- [ ] Threat catalog import
- [ ] Threat-to-risk linking
- [ ] Natural vs manmade threat categorization
- [ ] Material threat flagging

## Phase 4: Assessment & Evidence

### Assessment Framework
- [ ] Assessment campaign creation UI
- [ ] Assessment objective (AO) management
- [ ] Evidence request list (ERL) interface
- [ ] Evidence collection workflow
- [ ] Finding recording and tracking
- [ ] Conformity report generation
- [ ] Assessment rigor level selection (L1/L2/L3)

### Evidence Management
- [ ] Evidence upload and storage
- [ ] Evidence review workflow
- [ ] Evidence linking to AOs
- [ ] Evidence repository browser

### Findings & POA&M
- [ ] Finding severity classification
- [ ] POA&M task creation from findings
- [ ] POA&M tracking dashboard
- [ ] Remediation workflow
- [ ] Finding status updates

## Phase 5: Policy & Documentation

### Three-Tier Documentation
- [ ] Policy statement CRUD UI
- [ ] Standard statement CRUD UI
- [ ] Procedure CRUD UI
- [ ] Policy-to-control linking interface
- [ ] Document versioning
- [ ] Review cycle tracking
- [ ] Approval workflow

### Document Management
- [ ] Document templates
- [ ] Document export (PDF/DOCX)
- [ ] Document search and filter
- [ ] Ownership assignment

## Phase 6: Dashboards & Reporting

### Executive Dashboards
- [ ] Overall compliance posture
- [ ] Risk exposure summary
- [ ] Maturity heatmap by domain
- [ ] MCR vs DSR coverage
- [ ] Open findings by severity
- [ ] POA&M status tracking

### Operational Dashboards
- [ ] Control implementation status
- [ ] Assessment campaign progress
- [ ] Evidence collection status
- [ ] Upcoming policy reviews
- [ ] Overdue POA&M tasks

### Reporting
- [ ] Compliance posture report
- [ ] Risk register report
- [ ] Maturity assessment report
- [ ] Gap analysis report
- [ ] Framework crosswalk report
- [ ] Executive summary report
- [ ] Export capabilities (PDF, CSV, Excel)

### Corporate vs Product Views
- [ ] Organization-level filtering
- [ ] Hierarchical data aggregation
- [ ] Product-specific compliance views
- [ ] Multi-tenant reporting

## Phase 7: Advanced & Extensibility

### Plugin System
- [ ] Plugin manifest format
- [ ] Sandbox loader + capability flags
- [ ] OneTrust integration adapter
- [ ] Jira/ServiceNow integration for POA&M
- [ ] Vulnerability feed integration

### Automation & Intelligence
- [ ] Automated risk scoring calculations
- [ ] Control effectiveness trending
- [ ] Predictive maturity gap analysis
- [ ] ML-assisted control mapping
- [ ] Regulatory change monitoring

### Visualization (ReactFlow)
- [ ] Control relationship graph
- [ ] Risk-to-control flow diagram
- [ ] Assessment workflow visualization
- [ ] Framework mapping graph

### Performance & Hardening
- [ ] Complete RLS policy implementation
- [ ] Query optimization & indexes (already in schema)
- [ ] Caching strategy (React Query config + server hints)
- [ ] Security review checklist
- [ ] Audit logging
- [ ] Data retention policies

## Backlog / Future Ideas

### Enhancements
- [ ] Real-time collaboration on assessments
- [ ] AI-powered control recommendation
- [ ] Automated evidence collection from systems
- [ ] Integration with SIEM/SOAR platforms
- [ ] Mobile application for assessments
- [ ] Third-party risk assessment module
- [ ] Vendor management integration
- [ ] Contract management integration
- [ ] Incident-to-control correlation
- [ ] Predictive risk analytics
- [ ] Blockchain for audit trail

### Regulatory Intelligence
- [ ] Automated regulation tracking
- [ ] Change impact analysis
- [ ] Jurisdiction-specific requirements
- [ ] Alert system for new obligations

## Completed Items

### 2025.11.25 - Framework Mapping System Complete
- **[2025.11.25]** Fixed framework header mismatch (84 frameworks corrected)
- **[2025.11.25]** Re-imported all framework mappings (1,994 → 12,029 mappings)
- **[2025.11.25]** Added framework search functionality with case-insensitive matching
- **[2025.11.25]** Added selected-items-first sorting to framework filter panel
- **[2025.11.25]** Verified major frameworks: ISO 27001/27002, PCI DSS, CIS, SOC 2, COBIT
- **[2025.11.25]** 91/130 frameworks with mappings, 1,293/1,420 SCF controls mapped

### 2025.11.19 - Framework Explorer & Library Strategy
- **[2025.11.19]** Framework mapping explorer (grid/compare/multi-select views)
- **[2025.11.19]** Saved views feature (per-user + admin save-as-org)
- **[2025.11.19]** Load/Save modals with view management
- **[2025.11.19]** Library evaluation: React Query, recharts, react-grid-layout
- **[2025.11.19]** Decision: Static dashboards first, defer drag-and-drop
- **[2025.11.19]** Decision: Add ltree early for hierarchical SCF queries
- **[2025.11.19]** Fixed migration conflict in 20251119000001

### 2025.11.18 - SCF Architecture Implementation
- **[2025.11.18]** Complete SCF-centric schema design (41+ tables)
- **[2025.11.18]** TypeScript types for all SCF entities
- **[2025.11.18]** PPTDF model implementation
- **[2025.11.18]** MCR/DSR classification structure
- **[2025.11.18]** C|P-CMM maturity framework (L0-L5)
- **[2025.11.18]** C|P-RMM risk management model
- **[2025.11.18]** Assessment framework (AO/ERL/Findings)
- **[2025.11.18]** Obligations & requirements mapping
- **[2025.11.18]** External framework mapping architecture
- **[2025.11.18]** Policy/Standards/Procedures three-tier model
- **[2025.11.18]** Risk treatment & POA&M tracking
- **[2025.11.18]** Analytical views (coverage, exposure, maturity gaps)
- **[2025.11.18]** Architecture documentation created
- **[2025.11.18]** Implementation guide created

### 2025.10.24 - Initial Setup
- **[2025.10.24]** Initial README.md created
- **[2025.10.24]** Initial ToDo.md scaffold
- **[2025.10.24]** Updated README.md with chosen stack & roadmap
- **[2025.10.24]** Basic schema (now superseded by SCF schema)

## Conventions
- Use date format `YYYY.MM.DD` for completion stamps
- Add new items under relevant phase; if uncertain, place in Backlog
- When moving an item to completed: include brief clarification if outcome differs from original intent
- ✅ indicates completed phase/section
- [ ] indicates pending task
- [x] indicates completed task

## Notes
- **Architecture Shift (2025.11.18)**: Complete redesign to SCF-centric model
  - SCF controls are now the central hub (not generic "frameworks")
  - All external frameworks map TO SCF (unidirectional)
  - Full ICM governance model implemented
  - C|P-RMM and C|P-CMM fully integrated
  - PPTDF model for asset and control categorization
- Target lean internal usability first; optimize sophistication later
- Minimize premature abstraction—prove data model with real sample entries
- Keep plugin boundaries clean (no deep core coupling)
- Focus on SCF as single source of truth for all controls


## Reference Videos 
**Nice aduit view**
1:14 shows audit information in a nice table view 
- https://www.youtube.com/watch?v=zQU3_4tfyIs

**Issue Remeidation, Timeline, Executive Overview, Platform view on 1:06**
- https://www.youtube.com/watch?v=wQ1JkzBVaZ8


---
*Last Updated: November 25, 2025*