-- GRC Unified Platform Initial Schema (Draft)
-- NOTE: Adjust UUID strategy (pgcrypto/gen_random_uuid) based on Supabase defaults.

create extension if not exists "uuid-ossp";

-- Organizations: hierarchical multi-tenancy
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references organizations(id) on delete cascade,
  name text not null,
  org_type text, -- e.g., parent, subsidiary, product-line
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Users (Supabase auth will maintain auth.users; this table stores profile info)
create table if not exists users (
  id uuid primary key, -- matches auth.users.id
  email text not null unique,
  display_name text,
  created_at timestamptz default now()
);

-- Organization Memberships / Roles
create type user_role as enum ('admin','manager');
create table if not exists organization_members (
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role user_role not null,
  primary key (org_id, user_id)
);

-- Compliance Frameworks
create table if not exists frameworks (
  id uuid primary key default gen_random_uuid(),
  code text not null, -- e.g., ISO27001, SOC2
  name text not null,
  version text,
  description text,
  created_at timestamptz default now(),
  unique(code, version)
);

-- Regulations / Control Statements (granular items within a framework)
create table if not exists regulations (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid references frameworks(id) on delete cascade,
  ref_code text not null, -- e.g., A.5.1.1
  description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(framework_id, ref_code)
);

-- Policies (internal documents / statements)
create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  title text not null,
  status text default 'draft', -- draft, approved, archived
  body text, -- optional full text
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Policy ↔ Regulation mapping (justification / rationale for alignment)
create table if not exists policy_regulations (
  policy_id uuid references policies(id) on delete cascade,
  regulation_id uuid references regulations(id) on delete cascade,
  rationale text,
  confidence int, -- optional future field
  primary key (policy_id, regulation_id)
);

-- Framework Crosswalks (mapping controls to another framework's controls)
create table if not exists framework_crosswalks (
  id uuid primary key default gen_random_uuid(),
  source_framework_id uuid references frameworks(id) on delete cascade,
  source_ref text not null,
  target_framework_id uuid references frameworks(id) on delete cascade,
  target_ref text not null,
  confidence int, -- 0-100 subjective score
  notes text,
  created_at timestamptz default now(),
  unique(source_framework_id, source_ref, target_framework_id, target_ref)
);

-- Regulatory Intelligence (future)
create table if not exists regulatory_events (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text, -- e.g., US, EU
  title text not null,
  summary text,
  effective_date date,
  source_url text,
  created_at timestamptz default now()
);

-- ============ RLS POLICIES (Draft Placeholders) ============
-- Enable RLS
alter table organizations enable row level security;
alter table users enable row level security;
alter table organization_members enable row level security;
alter table policies enable row level security;
-- frameworks/regulations may be global (decide later if tenant-scoped)

-- Auth helper: expect a session variable current_org set by application logic
-- Example policy idea (pseudo - adjust to Supabase pattern using auth.uid())
-- create policy "Users can read their memberships" on organization_members for select
--   using (user_id = auth.uid());

-- Multi-tenant access pattern:
-- Managers: can access rows where org_id is in their descendant org list.
-- Admins: unrestricted.
-- You will implement a helper function to compute descendant orgs and reference it in USING clause.

-- Placeholder for future helper function
-- create function org_descendants(root uuid) returns table(id uuid) as $$ ... $$ language sql;

-- TODO: Add policies after confirming approach and creating auth mapping strategy.

-- Indexes for performance
create index if not exists idx_organizations_parent on organizations(parent_id);
create index if not exists idx_regulations_framework on regulations(framework_id);
create index if not exists idx_policies_org on policies(org_id);
create index if not exists idx_policy_regulations_regulation on policy_regulations(regulation_id);
create index if not exists idx_crosswalk_source on framework_crosswalks(source_framework_id, source_ref);
create index if not exists idx_crosswalk_target on framework_crosswalks(target_framework_id, target_ref);

-- Seed sample (optional - comment out in production migrations)
-- insert into organizations (name) values ('Parent Corp');
-- insert into organizations (name, parent_id) select 'Subsidiary A', id from organizations where name='Parent Corp';

-- ========= END INITIAL SCHEMA =========
