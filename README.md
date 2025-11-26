# GRC Unified Platform

## 🚀 Quick Start - How to Start the System

### Prerequisites
- **Node.js >= 20.9.0** (check with `node -v`)
- **Docker Desktop** running (for Supabase)
- **Supabase CLI** installed (`brew install supabase/tap/supabase`)

### Starting the System

1. **Start Supabase (Database + Auth)**
   ```bash
   # From project root
   supabase start
   ```
   Wait for all services to start (this takes 30-60 seconds)

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Platform**
   - **URL**: http://localhost:3000
   - **Login**: davidmoneil@gmail.com
   - **Password**: admin123

### Stopping the System

```bash
# Stop frontend: Ctrl+C in the terminal running npm run dev

# Stop Supabase
supabase stop
```

### Quick Health Check

After starting, verify everything works:
1. Go to http://localhost:3000
2. Login with credentials above
3. You should see the dashboard with statistics
4. Navigate to Organizations, Frameworks, or Policies pages
5. All data should load from the database

---

## Overview
The GRC Unified Platform is a **SCF-centric**, multi-tenant Governance, Risk, and Compliance (GRC) system that implements the **Integrated Controls Management (ICM)** model. The platform uses the **Secure Controls Framework (SCF)** as the central hub for all GRC operations, incorporating the **Cybersecurity & Privacy Risk Management Model (C|P-RMM)** and **Capability Maturity Model (C|P-CMM)**.

Built following the controls-as-hub philosophy where SCF controls serve as the anchor point for policies, standards, procedures, risks, assessments, maturity tracking, and compliance mapping.

## Core Objectives
This platform aims to:
1. **SCF-Centric Architecture**: Position SCF controls as the central hub for all GRC activities
2. **Integrated Controls Management (ICM)**: Implement the full ICM governance model with PDCA loop
3. **PPTDF Model**: Categorize controls and assets by People, Processes, Technology, Data, and Facilities
4. **MCR/DSR Classification**: Distinguish between Minimum Compliance Requirements and Discretionary Security Requirements
5. **C|P-CMM Maturity**: Track maturity levels (L0-L5) with negligence thresholds
6. **C|P-RMM Risk Management**: Full 17-step risk management process with impact, likelihood, and residual risk scoring
7. **Assessment Framework**: Complete AO (Assessment Objectives) and ERL (Evidence Request List) workflow
8. **Multi-Tenant**: Support nested organizational structures with role-based access control
9. **Framework Mapping**: Map external frameworks (ISO 27001, NIST CSF, SOC2, PCI-DSS) TO SCF controls
10. **Continuous Compliance**: Enable real-time compliance monitoring and reporting

## Technology Stack (Option 1 Selected)
- **Frontend**: Next.js 14 (TypeScript, App Router) + Tailwind CSS
- **Backend / Services**: Supabase (PostgreSQL + Auth + Storage + Realtime) self‑hosted or managed
- **Database**: PostgreSQL with Row Level Security (RLS) for tenant isolation
- **State / Data Layer**: React Query (server state), Zustand (light client state), Supabase client SDK
- **Auth Model**: Supabase Auth (email/password initially) + role mapping (admin, manager)
- **Future Visualization**: ReactFlow (for workflow/process diagrams)
- **Testing**: Vitest / Playwright (to be added)
- **Packaging & Deploy**: Docker (future), AWS ECS/Fargate or EC2 for hosting

## Multi-Tenancy Model
- Hierarchical `organizations` table (self-referencing parent_id) enables nested entities
- Manager role: access to assigned org + all descendants (no upward traversal)
- Admin role: global administrative access
- RLS policies enforce row-level separation; all queries scoped by organization context
- Future: soft partitioning + optional physical partitioning if scale demands

## Data Domain Architecture

### Core SCF Entities
- **SCF Controls**: Central hub with PPTDF applicability and MCR/DSR classification
- **Obligations & Requirements**: Laws, regulations, contracts mapped to SCF controls
- **External Framework Mappings**: ISO 27001, NIST CSF, SOC2, PCI-DSS mapped TO SCF
- **Policies, Standards, Procedures**: Three-tier documentation linked to SCF controls

### Risk & Assessment
- **Risks & Threats**: C|P-RMM risk catalog with IE/OL scoring and treatment decisions
- **Assessments**: Assessment campaigns with AOs, evidence collection, and findings
- **Maturity**: C|P-CMM L0-L5 maturity targets and assessments
- **POA&M**: Plan of Action & Milestones for remediation tracking

### Assets & Context
- **Assets**: PPTDF-categorized (People/Process/Technology/Data/Facility)
- **Incidents**: Security/privacy incidents linked to risks and controls
- **Conformity Reports**: Compliance status from Strictly Conforms to Material Weakness

### Organization & Users
- **Organizations**: Hierarchical multi-tenant structure
- **Users & Roles**: Admin/Manager roles with RLS policies
- **Dashboards**: Configurable views and analytics (planned)

## Roadmap Summary
| Phase | Focus | Highlights |
|-------|-------|-----------|
| 1 | Foundation | Auth, multi-tenant schema, CRUD for orgs/frameworks/policies |
| 2 | Core Mapping | Crosswalk engine, policy→reg mapping UI, import/export |
| 3 | Reporting & Dashboards | Configurable dashboards, corporate vs product views |
| 4 | Advanced | Plugin system, ReactFlow workflows, external integrations |

See `ToDo.md` for granular tasks and phase breakdown.

## Project Structure (Planned)
```
GRC_Unified_Platform/
├── README.md               # Project overview and architecture summary
├── ToDo.md                 # Roadmap & phased task tracking
├── documentation/          # Dated architecture decisions & change logs
├── frontend/               # Next.js application source
├── database/               # Schema & migration SQL files
├── plugins/                # Future plugin architecture modules
└── docs/                   # API & user documentation (future)
```


## 📋 First-Time Setup (Already Completed)

If you're setting up from scratch on a new machine, follow these steps:

### 1. Prerequisites
- **Node.js >= 20.9.0** (required for Next.js 16+)
  ```bash
  node -v  # Check your version
  # If needed, upgrade with nvm:
  nvm install 20.9.0
  nvm use 20.9.0
  nvm alias default 20.9.0
  ```
- **Docker Desktop** installed and running
- **Supabase CLI**
  ```bash
  brew install supabase/tap/supabase
  ```

### 2. Clone and Install
```bash
git clone <repo-url>
cd GRC_Unified_Platform

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Initialize Supabase (First Time Only)
```bash
supabase init
supabase start
```

### 4. Apply Database Migrations
```bash
# All migrations are already applied to your local database
# If you need to reset: supabase db reset
```

### 5. Create Environment File
```bash
cd frontend
# Copy the example or use existing .env.local
```

Your `.env.local` should contain:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-status>
```

---

## Troubleshooting

### Node.js Version Error (Next.js)
If you see:
```
You are using Node.js 18.17.0. For Next.js, Node.js version ">=20.9.0" is required.
```
Upgrade Node.js using nvm (see Prerequisites above).

### Supabase Docker Containers
Supabase runs multiple containers for each service (database, auth, storage, studio, etc.). This is normal and ensures all features are available locally.

---

## Database Schema

### SCF-Centric Design (41+ Tables)

The schema is completely redesigned around SCF controls as the central hub. See `database/scf_schema.sql` for full implementation.

**Core Tables:**
- `scf_controls`: Central SCF control catalog with PPTDF and MCR/DSR flags
- `obligations`, `requirements`, `control_requirements`: Legal/regulatory drivers
- `external_controls`, `scf_control_mappings`: Framework mappings TO SCF
- `policy_statements`, `standard_statements`, `procedures`: Three-tier documentation
- `assets`, `asset_controls`: PPTDF-categorized assets linked to controls
- `threats`, `risks`, `risk_controls`: C|P-RMM risk management
- `risk_treatments`, `poam_tasks`: Risk treatment and remediation tracking
- `maturity_targets`, `maturity_assessments`: C|P-CMM maturity tracking
- `assessments`, `assessment_objectives`, `evidence_items`, `findings`: Assessment workflow
- `conformity_reports`: Compliance status reporting
- `incidents`, `incident_controls`: Security/privacy incident tracking

**Analytical Views:**
- `v_control_coverage`: Control implementation coverage statistics
- `v_risk_exposure`: Risk register with inherent/residual scores
- `v_maturity_gaps`: Maturity gap analysis with negligence flags

**See detailed documentation:** `documentation/2025.11.18_scf_architecture.md`

RLS (to be implemented) ensures multi-tenant isolation by organization hierarchy.

## Supabase: Local vs Managed
Self-hosting Supabase locally gives you:
- Full Postgres + Auth + Storage feature parity for development
- No vendor lock for internal testing
- Direct control over backups & retention
Differences vs managed:
- Managed service handles scaling, monitoring, automated upgrades
- Email/SMS providers need manual config locally
- High availability & failover require extra infra when self-hosted
For single-team internal use, local + lightweight AWS deploy later is sufficient. Migration to managed or hardened cluster can occur once performance or availability needs grow.

## Future Integrations (Planned Architecture Hooks)
- OneTrust / risk register ingestion (plugin adapter pattern)
- Ticketing (Jira / ServiceNow) for remediation workflows
- Vulnerability feeds (e.g., dependency scanning) mapped to policies
- External compliance evidence storage (S3 / object stores)

## Status
🎯 **Current Phase: React Query Migration Complete - Phase 5 Done**

**Latest Updates (2025.11.23):**
- ✅ **Complete React Query migration across all pages**
- ✅ **Framework Mappings Explorer rebuilt** (reduced from 1,473 to ~400 lines)
- ✅ **Saved Views functionality** with load/save/delete
- ✅ **6 custom hooks created** for consistent data fetching
- ✅ **Automatic caching and cache invalidation**
- ✅ **Loading and error states handled automatically**
- ✅ **React Query DevTools** available in development
- ✅ Organizations, Frameworks, Policies, Dashboard all using React Query
- ✅ Organization Frameworks with full CRUD operations

**Database (2025.11.18-19):**
- ✅ Complete SCF-centric schema (41+ tables)
- ✅ All migrations applied successfully
- ✅ 1,420 SCF controls loaded
- ✅ 5,525 assessment objectives
- ✅ 265 evidence templates
- ✅ 35 frameworks with 15,025+ mappings
- ✅ ltree extension enabled for hierarchical data
- ✅ saved_views and organization_frameworks tables

**Frontend Architecture:**
- ✅ Next.js 16 with Turbopack
- ✅ React 19.2.0
- ✅ TypeScript throughout
- ✅ Tailwind CSS 4.1.16
- ✅ React Query v5.90.5 for state management
- ✅ Date-fns for date formatting
- ✅ Lucide React for icons

**See:** `REACT_QUERY_MIGRATION_COMPLETE.md` for detailed migration documentation

## Contributing (Early Internal Phase)
1. Create feature branch
2. Update relevant documentation in `documentation/`
3. Submit PR with description & migration notes
4. Keep `ToDo.md` in sync for any roadmap changes

## License
Internal proprietary (license decision pending; may shift to dual-license model later).

---
*Last Updated: October 24, 2025*# GRC_Platform
