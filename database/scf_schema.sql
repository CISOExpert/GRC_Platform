-- ============================================================================
-- GRC Unified Platform - SCF-Centric Schema
-- Based on: SCF + ICM + C|P-RMM + C|P-CMM Integrated Model
-- ============================================================================
-- This schema positions SCF controls as the central hub for all GRC operations
-- following the Integrated Controls Management (ICM) model
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

-- Maturity Levels (C|P-CMM)
create type maturity_level as enum (
  'L0', -- Not Performed
  'L1', -- Performed Informally
  'L2', -- Planned & Tracked
  'L3', -- Well Defined
  'L4', -- Quantitatively Controlled
  'L5'  -- Continuously Improving
);

-- Obligation Types
create type obligation_type as enum (
  'statutory',    -- Laws
  'regulatory',   -- Regulations
  'contractual'   -- Contracts/SLAs
);

-- Asset Types (PPTDF Model)
create type asset_type as enum (
  'people',
  'process',
  'technology',
  'data',
  'facility'
);

-- Risk Categories
create type risk_category as enum (
  'strategic',
  'operational',
  'compliance',
  'financial',
  'reputational',
  'technology',
  'third_party'
);

-- Threat Categories
create type threat_category as enum (
  'natural',
  'manmade'
);

-- Risk Treatment Decisions
create type risk_treatment_decision as enum (
  'reduce',
  'avoid',
  'transfer',
  'accept'
);

-- Assessment Rigor Levels (C|P-RMM Step 8)
create type assessment_rigor as enum (
  'L1', -- Standard
  'L2', -- Enhanced
  'L3'  -- Comprehensive
);

-- Finding Severity
create type finding_severity as enum (
  'observation',
  'significant_deficiency',
  'material_weakness'
);

-- Conformity Status (C|P-RMM Step 14)
create type conformity_status as enum (
  'strictly_conforms',
  'conforms',
  'significant_deficiency',
  'material_weakness'
);

-- ============================================================================
-- CORE SCF CONTROLS (The Central Hub)
-- ============================================================================

create table if not exists scf_controls (
  id uuid primary key default gen_random_uuid(),
  control_id text not null unique, -- SCF control identifier (e.g., GOV-01, IAC-02)
  title text not null,
  description text not null,
  domain text not null, -- SCF domain (Governance, Identity & Access Control, etc.)
  
  -- Control Classification
  weight numeric(5,2) default 1.0, -- Materiality weighting
  is_material_control boolean default false,
  is_mcr boolean default false, -- Minimum Compliance Requirement
  is_dsr boolean default false, -- Discretionary Security Requirement
  
  -- PPTDF Applicability Flags
  applicability_people boolean default false,
  applicability_processes boolean default false,
  applicability_technology boolean default false,
  applicability_data boolean default false,
  applicability_facilities boolean default false,
  
  -- Metadata
  scf_version text, -- SCF version this control belongs to
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- OBLIGATIONS & REQUIREMENTS (MCR/DSR Drivers)
-- ============================================================================

create table if not exists obligations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type obligation_type not null,
  jurisdiction text, -- e.g., US, EU, California
  description text,
  source_reference text, -- Law/regulation citation
  effective_date date,
  status text default 'active', -- active, superseded, archived
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid references obligations(id) on delete cascade,
  statement text not null, -- Specific requirement text
  category text, -- security, privacy, resilience
  priority text, -- high, medium, low
  mandatory_flag boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Map requirements to SCF controls
create table if not exists control_requirements (
  id uuid primary key default gen_random_uuid(),
  control_id uuid references scf_controls(id) on delete cascade,
  requirement_id uuid references requirements(id) on delete cascade,
  mapping_type text, -- subset, intersects, equal, superset
  mapping_notes text,
  created_at timestamptz default now(),
  unique(control_id, requirement_id)
);

-- ============================================================================
-- EXTERNAL FRAMEWORKS & MAPPINGS (Map TO SCF, not peer-to-peer)
-- ============================================================================

-- Keep frameworks table for external framework catalog
-- (ISO 27001, NIST CSF, SOC2, PCI-DSS, etc.)
-- NOTE: frameworks table already exists in original schema

-- Rename regulations to external_controls for clarity
create table if not exists external_controls (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid references frameworks(id) on delete cascade,
  ref_code text not null, -- e.g., A.5.1.1 for ISO 27001
  description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(framework_id, ref_code)
);

-- Map external framework controls TO SCF controls (SCF is the hub)
create table if not exists scf_control_mappings (
  id uuid primary key default gen_random_uuid(),
  scf_control_id uuid references scf_controls(id) on delete cascade,
  external_control_id uuid references external_controls(id) on delete cascade,
  framework_id uuid references frameworks(id) on delete cascade,
  mapping_strength text, -- full, partial, related
  confidence int check (confidence >= 0 and confidence <= 100),
  notes text,
  created_at timestamptz default now(),
  unique(scf_control_id, external_control_id)
);

-- ============================================================================
-- POLICIES, STANDARDS, PROCEDURES (Linked to SCF Controls)
-- ============================================================================

create table if not exists policy_statements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text,
  owner text, -- Role or person responsible
  status text default 'draft', -- draft, approved, archived
  version text,
  last_reviewed_date date,
  next_review_date date,
  body text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists standard_statements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text, -- "shall/should" statements
  owner text,
  status text default 'draft',
  version text,
  last_reviewed_date date,
  body text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists procedures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text, -- Step-by-step instructions
  owner text,
  status text default 'draft',
  version text,
  last_reviewed_date date,
  body text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Link policies/standards/procedures to SCF controls
create table if not exists control_policies (
  control_id uuid references scf_controls(id) on delete cascade,
  policy_id uuid references policy_statements(id) on delete cascade,
  primary key (control_id, policy_id)
);

create table if not exists control_standards (
  control_id uuid references scf_controls(id) on delete cascade,
  standard_id uuid references standard_statements(id) on delete cascade,
  primary key (control_id, standard_id)
);

create table if not exists control_procedures (
  control_id uuid references scf_controls(id) on delete cascade,
  procedure_id uuid references procedures(id) on delete cascade,
  primary key (control_id, procedure_id)
);

-- ============================================================================
-- ASSETS & PPTDF CONTEXT
-- ============================================================================

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  asset_type asset_type not null, -- People, Process, Technology, Data, Facility
  description text,
  business_owner text,
  technical_owner text,
  criticality text, -- high, medium, low
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Link assets to controls (which controls protect which assets)
create table if not exists asset_controls (
  asset_id uuid references assets(id) on delete cascade,
  control_id uuid references scf_controls(id) on delete cascade,
  primary key (asset_id, control_id)
);

-- ============================================================================
-- THREATS & RISKS (C|P-RMM Catalogs)
-- ============================================================================

create table if not exists threats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category threat_category not null,
  description text,
  is_material_threat boolean default false,
  threat_references text, -- External threat intelligence references
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  risk_id text unique, -- Human-readable ID (e.g., RISK-2025-001)
  title text not null,
  description text,
  category risk_category,
  
  -- Relationships
  primary_asset_id uuid references assets(id) on delete set null,
  threat_id uuid references threats(id) on delete set null,
  risk_owner text, -- LOB/Function owner
  
  -- C|P-RMM Risk Scoring
  impact_effect numeric(5,2), -- IE score
  occurrence_likelihood numeric(5,2), -- OL score
  inherent_risk_score numeric(10,2), -- Calculated: IE * OL
  residual_risk_score numeric(10,2), -- After controls applied
  
  -- Risk Appetite & Tolerance
  risk_tolerance_band text, -- Low, Moderate, High
  risk_threshold numeric(10,2), -- Trigger value
  risk_appetite_tag text, -- How it relates to org appetite
  
  status text default 'identified', -- identified, assessed, treated, monitored
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Link risks to SCF controls (controls that mitigate risks)
create table if not exists risk_controls (
  risk_id uuid references risks(id) on delete cascade,
  control_id uuid references scf_controls(id) on delete cascade,
  control_effectiveness text, -- effective, partially_effective, ineffective
  primary key (risk_id, control_id)
);

-- ============================================================================
-- INCIDENTS
-- ============================================================================

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text,
  date_detected timestamptz,
  impact_summary text,
  status text default 'open', -- open, investigating, resolved, closed
  is_material_incident boolean default false,
  related_risk_id uuid references risks(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Link incidents to controls
create table if not exists incident_controls (
  incident_id uuid references incidents(id) on delete cascade,
  control_id uuid references scf_controls(id) on delete cascade,
  primary key (incident_id, control_id)
);

-- ============================================================================
-- MATURITY MODEL (C|P-CMM)
-- ============================================================================

create table if not exists maturity_targets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  scope_type text not null, -- control, domain, organization, project
  scope_ref_id uuid, -- ID of the scoped entity (control_id, etc.)
  target_level maturity_level not null,
  negligence_threshold maturity_level, -- Minimum acceptable level
  rationale text,
  effective_date date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists maturity_assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  control_id uuid references scf_controls(id) on delete cascade,
  assessment_id uuid, -- Links to assessment event (optional)
  assessed_level maturity_level not null,
  evidence_summary text,
  reviewer text,
  assessment_date date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================================
-- ASSESSMENTS & EVIDENCE (C|P-RMM Steps 8-11)
-- ============================================================================

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  scope_description text, -- Assessment boundary
  rigor_level assessment_rigor not null,
  start_date date,
  end_date date,
  assessor_type text, -- 1PD (first party), 3PA (third party), etc.
  status text default 'planned', -- planned, in_progress, completed, archived
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Assessment Objectives (AOs) - what we're checking per control
create table if not exists assessment_objectives (
  id uuid primary key default gen_random_uuid(),
  control_id uuid references scf_controls(id) on delete cascade,
  statement text not null, -- What needs to be verified
  evidence_expected text, -- Type of evidence needed (ERL category)
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Evidence Items (ERL - Evidence Request List)
create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  ao_id uuid references assessment_objectives(id) on delete cascade,
  evidence_type text, -- document, screenshot, config_export, interview_notes
  location text, -- File path, URL, or storage location
  reviewer text,
  review_date date,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Findings from assessments
create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  control_id uuid references scf_controls(id) on delete cascade,
  severity finding_severity not null,
  description text not null,
  related_risk_id uuid references risks(id) on delete set null,
  recommended_action text,
  status text default 'open', -- open, remediation_planned, remediated, accepted
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Conformity Reports (C|P-RMM Step 14)
create table if not exists conformity_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  control_id uuid references scf_controls(id) on delete cascade,
  conformity_status conformity_status not null,
  summary text,
  report_date date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================================
-- RISK TREATMENT & POA&M (C|P-RMM Steps 15-17)
-- ============================================================================

create table if not exists risk_treatments (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid references risks(id) on delete cascade,
  decision risk_treatment_decision not null,
  justification text,
  approval_level text, -- Based on risk thresholds and authority levels
  approver text,
  effective_date date,
  planned_actions text,
  status text default 'pending', -- pending, approved, implemented, closed
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Plan of Action & Milestones (POA&M)
create table if not exists poam_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  treatment_id uuid references risk_treatments(id) on delete set null,
  control_id uuid references scf_controls(id) on delete set null,
  finding_id uuid references findings(id) on delete set null,
  title text not null,
  description text,
  owner text,
  due_date date,
  status text default 'open', -- open, in_progress, completed, overdue
  priority text, -- critical, high, medium, low
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- SCF Controls
create index if not exists idx_scf_controls_domain on scf_controls(domain);
create index if not exists idx_scf_controls_mcr on scf_controls(is_mcr) where is_mcr = true;
create index if not exists idx_scf_controls_dsr on scf_controls(is_dsr) where is_dsr = true;
create index if not exists idx_scf_controls_material on scf_controls(is_material_control) where is_material_control = true;

-- Obligations & Requirements
create index if not exists idx_obligations_type on obligations(type);
create index if not exists idx_requirements_obligation on requirements(obligation_id);
create index if not exists idx_control_requirements_control on control_requirements(control_id);
create index if not exists idx_control_requirements_requirement on control_requirements(requirement_id);

-- External Mappings
create index if not exists idx_external_controls_framework on external_controls(framework_id);
create index if not exists idx_scf_mappings_scf on scf_control_mappings(scf_control_id);
create index if not exists idx_scf_mappings_external on scf_control_mappings(external_control_id);
create index if not exists idx_scf_mappings_framework on scf_control_mappings(framework_id);

-- Assets
create index if not exists idx_assets_org on assets(org_id);
create index if not exists idx_assets_type on assets(asset_type);
create index if not exists idx_asset_controls_asset on asset_controls(asset_id);
create index if not exists idx_asset_controls_control on asset_controls(control_id);

-- Risks
create index if not exists idx_risks_org on risks(org_id);
create index if not exists idx_risks_category on risks(category);
create index if not exists idx_risks_status on risks(status);
create index if not exists idx_risk_controls_risk on risk_controls(risk_id);
create index if not exists idx_risk_controls_control on risk_controls(control_id);

-- Assessments
create index if not exists idx_assessments_org on assessments(org_id);
create index if not exists idx_assessments_status on assessments(status);
create index if not exists idx_findings_assessment on findings(assessment_id);
create index if not exists idx_findings_control on findings(control_id);
create index if not exists idx_findings_status on findings(status);

-- Maturity
create index if not exists idx_maturity_targets_org on maturity_targets(org_id);
create index if not exists idx_maturity_assessments_control on maturity_assessments(control_id);

-- POA&M
create index if not exists idx_poam_org on poam_tasks(org_id);
create index if not exists idx_poam_status on poam_tasks(status);
create index if not exists idx_poam_control on poam_tasks(control_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - To be implemented per original schema pattern
-- ============================================================================

-- Enable RLS on new tables
alter table scf_controls enable row level security;
alter table obligations enable row level security;
alter table requirements enable row level security;
alter table external_controls enable row level security;
alter table policy_statements enable row level security;
alter table standard_statements enable row level security;
alter table procedures enable row level security;
alter table assets enable row level security;
alter table threats enable row level security;
alter table risks enable row level security;
alter table incidents enable row level security;
alter table maturity_targets enable row level security;
alter table maturity_assessments enable row level security;
alter table assessments enable row level security;
alter table findings enable row level security;
alter table risk_treatments enable row level security;
alter table poam_tasks enable row level security;

-- TODO: Implement specific RLS policies following the organization hierarchy pattern
-- SCF controls may be global (shared across organizations) or org-specific
-- Other entities scoped by org_id using descendant organization logic

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Control Coverage Summary
create or replace view v_control_coverage as
select 
  c.id,
  c.control_id,
  c.title,
  c.domain,
  c.is_mcr,
  c.is_dsr,
  count(distinct cp.policy_id) as policy_count,
  count(distinct cs.standard_id) as standard_count,
  count(distinct cpr.procedure_id) as procedure_count,
  count(distinct ac.asset_id) as asset_count,
  count(distinct rc.risk_id) as risk_count
from scf_controls c
left join control_policies cp on c.id = cp.control_id
left join control_standards cs on c.id = cs.control_id
left join control_procedures cpr on c.id = cpr.control_id
left join asset_controls ac on c.id = ac.control_id
left join risk_controls rc on c.id = rc.control_id
group by c.id, c.control_id, c.title, c.domain, c.is_mcr, c.is_dsr;

-- Risk Exposure Summary
create or replace view v_risk_exposure as
select
  r.id,
  r.risk_id,
  r.title,
  r.category,
  r.inherent_risk_score,
  r.residual_risk_score,
  r.risk_tolerance_band,
  r.status,
  rt.decision as treatment_decision,
  count(distinct rc.control_id) as mitigating_controls_count
from risks r
left join risk_treatments rt on r.id = rt.risk_id
left join risk_controls rc on r.id = rc.risk_id
group by r.id, r.risk_id, r.title, r.category, r.inherent_risk_score, 
         r.residual_risk_score, r.risk_tolerance_band, r.status, rt.decision;

-- Maturity Gap Analysis
create or replace view v_maturity_gaps as
select
  c.id as control_id,
  c.control_id as scf_id,
  c.title,
  c.domain,
  mt.target_level,
  mt.negligence_threshold,
  ma.assessed_level,
  ma.assessment_date,
  case 
    when ma.assessed_level < mt.negligence_threshold then 'CRITICAL'
    when ma.assessed_level < mt.target_level then 'GAP'
    when ma.assessed_level >= mt.target_level then 'MEETS_TARGET'
    else 'NOT_ASSESSED'
  end as gap_status
from scf_controls c
left join maturity_targets mt on mt.scope_ref_id = c.id and mt.scope_type = 'control'
left join lateral (
  select assessed_level, assessment_date
  from maturity_assessments
  where control_id = c.id
  order by assessment_date desc
  limit 1
) ma on true;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table scf_controls is 'Central hub: SCF control catalog with PPTDF applicability and MCR/DSR classification';
comment on table obligations is 'Statutory, regulatory, and contractual obligations that drive MCR requirements';
comment on table requirements is 'Specific clauses from obligations that map to SCF controls';
comment on table scf_control_mappings is 'Maps external framework controls TO SCF controls (SCF as hub)';
comment on table maturity_targets is 'Target maturity levels (L0-L5) per control/domain with negligence thresholds';
comment on table maturity_assessments is 'Actual assessed maturity ratings for controls';
comment on table assessments is 'Assessment campaigns with rigor levels (C|P-RMM Step 8)';
comment on table assessment_objectives is 'What to check per control (AOs)';
comment on table evidence_items is 'Evidence collected during assessments (ERL)';
comment on table findings is 'Assessment results showing control deficiencies';
comment on table risks is 'Risk catalog with C|P-RMM scoring (IE, OL, inherent/residual)';
comment on table risk_treatments is 'Management decisions on risk treatment (reduce/avoid/transfer/accept)';
comment on table poam_tasks is 'Plan of Action & Milestones for remediation tracking';

-- ============================================================================
-- END SCF-CENTRIC SCHEMA
-- ============================================================================
