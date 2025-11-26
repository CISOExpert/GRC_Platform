# GRC Unified Platform - Priorities

## ✅ Completed Work

### Phase 1: Foundation (Nov 18-19, 2025)
- [x] SCF-centric database schema (39 tables, 11 enums, 3 views)
- [x] Complete SCF data import (1,420 controls, 5,525 AOs, 265 evidence templates)
- [x] Supabase local deployment with PostgreSQL
- [x] Frontend modernization (Next.js 14, React 19, Tailwind CSS 4)
- [x] Dashboard with live SCF statistics
- [x] SCF Controls Explorer with search/filter
- [x] Evidence Templates page
- [x] Organizations management

### Phase 2: Bug Fixes & Optimization (Nov 19, 2025)
- [x] Disabled RLS for local development
- [x] Fixed hydration warnings
- [x] Fixed auth refresh token errors
- [x] Fixed organization creation (metadata JSONB pattern)

### Phase 3: Framework Mapping System (Nov 19, 2025)
- [x] Framework mapping infrastructure (organization_frameworks table)
- [x] NIST CSF v2.0 import (105 controls)
- [x] Framework selection UI for organizations
- [x] **All 35 frameworks imported** (15,025 total mappings)
  - SOC 2, CIS Controls v8.1, COBIT 2019
  - ISO 27001/27002/27017/27018/27701/42001
  - NIST 800-53, 800-171, CSF v1.1/v2.0, Privacy Framework, AI RMF
  - PCI DSS v3.2/v4.0.1, HIPAA, GDPR
  - FedRAMP, CMMC, CSA CCM, SOX, CCPA, NY DFS
- [x] Control mapping view (v_control_mappings)
- [x] Hierarchy tracking (Category/Subcategory/Control levels)
- [x] Bidirectional mapping capabilities

### Phase 4: Critical Infrastructure (Nov 19, 2025 - Evening)
- [x] Fixed migration conflict in organization_frameworks view
- [x] Fixed missing update_updated_at_column() function
- [x] Applied all database migrations (organization_frameworks, saved_views, ltree)
- [x] Installed date-fns for date formatting
- [x] Set up React Query with QueryProvider
- [x] Created query hooks and key management utilities
- [x] Installed React Query Devtools for development
- [x] Updated root layout with QueryProvider integration

### Phase 5: React Query Migration (Nov 23, 2025)
- [x] Created environment variables file (.env.local)
- [x] Created admin user account for testing
- [x] Restarted development server
- [x] Created reusable organization hooks (useOrganizations, useCreateOrganization, etc.)
- [x] Converted organizations page to use React Query
- [x] Implemented proper error handling and loading states
- [x] Set up mutation patterns with automatic cache invalidation

### Phase 6: Framework Mapping System Complete (Nov 25, 2025)
- [x] Identified framework header mismatch issue (newlines vs spaces)
- [x] Fixed 84 framework mapping_column_header values to match Excel format
- [x] Re-imported all framework mappings (1,994 → 12,029 mappings)
- [x] Created 8,348 external controls across 91 frameworks
- [x] Added framework search functionality (case-insensitive)
- [x] Added selected-items-first sorting to framework filter panel
- [x] Verified major frameworks: ISO 27001/27002/27017/27701, PCI DSS, CIS Controls, SOC 2, COBIT
- [x] Achieved 91/130 frameworks with mappings (70% coverage)
- [x] Achieved 1,293/1,420 SCF controls with mappings (91% coverage)

---

## 🚧 Current Sprint: Framework Explorer Enhancements

### In Progress
- [ ] Add control count to framework filter labels (e.g., "ISO 27002 2022 (316)")
- [ ] Test SCF view with new mappings
- [ ] Verify all major frameworks display correctly in UI
- [ ] Organization switcher component (top nav)
- [ ] Gap analysis view (highlight unmapped controls)

### Recently Completed
- [x] Framework search functionality
- [x] Selected-items-first sorting
- [x] All framework mappings fixed and imported (12,029 total)
- [x] Framework filter panel with 91 working frameworks

---

## 📋 Backlog

### High Priority - Near Term

#### Framework Explorer Enhancements
- [ ] Gap analysis view (highlight unmapped controls)
- [ ] Cross-framework comparison (Venn diagram visualization)
- [ ] Saved filter presets ("My NIST View", "Cloud Security Stack")
- [ ] Export capabilities (CSV/Excel)
- [ ] Coverage heatmap visualization
- [ ] Mapping confidence score indicators

#### Risk & Threat Management
- [ ] Import SCF Risk Taxonomy (R-AC-1 through R-SC-6)
  - Create `scf_risks` table
  - Map risks to SCF controls
- [ ] Import SCF Threat Catalog (NT-1 through MT-27)
  - Create `scf_threats` table
  - Map threats to SCF controls
- [ ] `/explore/risks` - Risk exploration page
- [ ] `/explore/threats` - Threat exploration page

#### User & Organization Management
- [ ] User authentication system
- [ ] User-to-Organization assignment
- [ ] Role-based access control (Admin, User, Auditor)
- [ ] "View as User" functionality for admins
- [ ] Organization-scoped data access
- [ ] Audit logging for user actions

### Medium Priority - Future Releases

#### Assessment & Compliance Workflow
- [ ] Assessment creation and management
- [ ] Control implementation tracking
- [ ] Evidence collection workflow
- [ ] Compliance scoring dashboard
- [ ] Remediation task management
- [ ] Timeline/milestone tracking

#### Reporting & Analytics
- [ ] Compliance posture reports
- [ ] Framework coverage reports
- [ ] Risk assessment reports
- [ ] Executive dashboards
- [ ] Trend analysis over time
- [ ] Custom report builder

#### Integration & Automation
- [ ] API endpoints for external integrations
- [ ] Webhook support for notifications
- [ ] Automated evidence collection
- [ ] SIEM/log integration
- [ ] Ticketing system integration (Jira, ServiceNow)
- [ ] Email notifications

### Low Priority - Long Term

#### Advanced Features
- [ ] AI-powered control recommendations
- [ ] Natural language search across controls
- [ ] Document management system
- [ ] Vendor risk management
- [ ] Third-party assessment sharing
- [ ] Mobile app (read-only)

#### Platform Enhancements
- [ ] Multi-tenancy support
- [ ] White-label branding
- [ ] Advanced caching strategies
- [ ] Performance optimization
- [ ] Offline mode support
- [ ] Internationalization (i18n)

---

## 🎯 Current Focus Areas

### This Week
1. **Framework Mapping Explorer** - Complete full-featured exploration interface
2. **Organization Context** - Implement org switcher and filtered views
3. **Risk/Threat Import** - Prepare schema and import scripts

### Next Week
1. **User Management** - Basic auth and org assignment
2. **Assessment Workflow** - Initial assessment creation
3. **Evidence Management** - Link evidence to controls

---

## 📊 Metrics

### Current State
- **Database**: 39 tables, ~28,000 total records
- **Frameworks**: 130 imported (91 with mappings)
- **External Controls**: 14,351 framework-specific controls
- **Mappings**: 12,029 control mappings
- **SCF Coverage**: 91.1% (1,293/1,420 controls mapped)
- **Frontend Pages**: 7 functional pages
- **API Endpoints**: Using Supabase REST API

### Goals (End of Q1 2026)
- **User Accounts**: Support 50+ concurrent users
- **Organizations**: 10+ organizations configured
- **Assessments**: 25+ active assessments
- **Evidence Items**: 500+ pieces of evidence collected
- **Compliance Reports**: 100+ reports generated

---

## 🐛 Known Issues

### Critical
- None currently

### Medium
- None currently

### Low
- Dashboard page was accidentally deleted (need to recreate)
- Some framework mappings show >100% coverage due to multiple SCF controls mapping to single framework controls

---

## 💡 Ideas & Research

### Future Exploration
- Graph database for relationship visualization (Neo4j)
- AI/ML for automated control gap detection
- Blockchain for immutable audit trail
- Real-time collaboration features
- Predictive analytics for risk trends

---

**Last Updated**: November 25, 2025
**Version**: 0.4.0-alpha
