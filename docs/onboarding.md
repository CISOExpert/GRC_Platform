# Developer Onboarding

Welcome to the GRC Unified Platform. This guide walks you through getting set up as a developer, running the app locally, and working safely with the database.

---

## Prerequisites

Install the following tools before you start:

- **Node.js**: v20.x (LTS recommended)
- **npm**: v10.x (bundled with Node 20)
- **Python**: 3.11+ (for import/maintenance scripts)
- **Docker Desktop**: latest stable (for local Supabase/Postgres)
- **Git**: latest stable
- **psql** (optional but useful) or a SQL client of your choice

> Tip: Use a Node version manager (e.g., `nvm`) to keep Node versions aligned.

---

## Cloning and Setup

1. **Clone the repository**

```bash
git clone https://github.com/CISOExpert/GRC_Platform.git
cd GRC_Platform
```

2. **Install root dependencies** (scripts, tooling)

```bash
npm install
```

3. **Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

4. **Create environment files**

Copy the example env files if present, or create them:

```bash
cp frontend/.env.example frontend/.env.local  # if .env.example exists
```

At minimum, configure in `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # from local Supabase
```

For server-side scripts, you may also want a `.env` at the repo root for DB connection strings (do **not** commit secrets).

---

## Running the App Locally

1. **Start local Supabase/Postgres (dev_db)**

If you use Supabase CLI and a local stack:

```bash
# From repo root
supabase start
```

This starts:
- Postgres on `localhost:54322`
- Supabase API on `http://localhost:54321`

2. **Run the frontend (Next.js app)**

```bash
cd frontend
npm run dev
```

Then open:

- App: http://localhost:3000

### Common Pitfalls

- **Migrations not applied**: If the UI shows missing tables, ensure migrations have run (see next section).
- **Wrong Supabase URL/key**: Double-check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Port conflicts**: If ports 3000 or 54321/54322 are in use, stop other services or adjust configs.

---

## Database Setup

All schema and core data live in PostgreSQL via Supabase. We work primarily against **`dev_db`** when developing.

### 1. Start/Connect to Local DB

If using Supabase CLI:

```bash
supabase start
```

To connect with `psql`:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 2. Run Migrations

Migrations are under `supabase/migrations/`.

If using Supabase CLI:

```bash
supabase db reset   # dev_db only; applies all migrations
# or
supabase db push    # apply migrations without reset
```

> **Only run `reset` against `dev_db`. Never reset `stage_db` or `prod_db`.**

### 3. Seed Data Safely

We use Python scripts under `scripts/` to import SCF and framework data.

From repo root (with `dev_db` running):

```bash
python scripts/import_scf_controls.py
python scripts/import_scf_framework_mappings.py
python scripts/import_all_framework_mappings.py
python scripts/import_assessment_objectives.py
python scripts/import_evidence_templates.py
python scripts/seed_test_user.py
```

Run only the scripts you need; each script is designed to be safe and repeatable for `dev_db`.

> **Never point these scripts at `stage_db` or `prod_db` without explicit review and configuration.**

---

## Database Safety Rules

We treat the database as a critical asset. Follow these rules at all times:

- **Never** run `DROP DATABASE`, `TRUNCATE`, or full-schema resets against **any** shared environment.
- **Never** run destructive SQL (broad `DELETE`/`UPDATE` without `WHERE`) against `stage_db` or `prod_db`.
- **Always**:
  - Inspect data with read-only `SELECT` first.
  - Use migrations or versioned patches instead of ad-hoc console SQL.
  - Make patches idempotent and logged.

For detailed guidance, read:

- `docs/db-patching-guidelines.md` – how to design safe, idempotent patches.
- `docs/copilot-guidelines.md` – expectations for both humans and AI assistants.

---

## Testing

Testing is split across simple scripts and any future test harnesses.

### API / Data Validation Scripts

From repo root:

```bash
# Check DB connectivity
node test_connection.js

# Test a sample query
node test_query.js

# Validate SCF framework setup
node test_scf_framework.js

# Validate RPC/function behavior
python scripts/test_rpc_function.py

# Validate framework counts and mappings
python scripts/test_framework_counts.py
python scripts/test_framework_counts_full.py
```

Ensure `dev_db` is running before executing these.

As the project grows, Jest/Playwright or similar frameworks may be added; follow any additional instructions in `README.md` or package scripts.

---

## Common Tasks & Recipes

### 1. Add a New Frontend Feature (Page or Endpoint)

1. Create or update a route under `frontend/app/(dashboard)/...`.
2. Use existing hooks for data:

```tsx
import { useOrganizations } from '@/lib/hooks/useOrganizations'

export default function OrganizationsPage() {
  const { data, isLoading, error } = useOrganizations()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading organizations</div>

  return (
    <ul>
      {data?.map(org => (
        <li key={org.id}>{org.name}</li>
      ))}
    </ul>
  )
}
```

3. Run the app with `npm run dev` from `frontend/`.

### 2. Add a New Migration

1. Create a new SQL file under `supabase/migrations/` following existing naming patterns, e.g.:

```bash
supabase migration new 20251126_add_new_table
```

2. Edit the generated SQL to add tables/columns/views.
3. Apply to `dev_db`:

```bash
supabase db push
```

4. Verify with `SELECT` queries or the app.

### 3. Create a Data Patch in `db/patches/`

1. Create a new patch file, e.g. `db/patches/20251126_fix_example.sql`.
2. Follow the template in `docs/db-patching-guidelines.md`:

```sql
-- Purpose: Fix incorrect mappings for framework XYZ.
-- Validation: SELECT ... before and after.

BEGIN;

UPDATE scf_control_mappings
SET mapping_strength = 'exact'
WHERE framework_id = :framework_id
  AND scf_control_id IN (...)
  AND mapping_strength IS DISTINCT FROM 'exact';

COMMIT;
```

3. Test against `dev_db` first.

### 4. Run a Patch Script Safely

Assuming you have a patch SQL file and `psql` access to `dev_db`:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f db/patches/20251126_fix_example.sql
```

Never apply new patches directly to `stage_db` or `prod_db` without:
- Review,
- Backup/snapshot,
- Testing in `dev_db` and `stage_db`.

### 5. Import or Re-Import Framework Data

From repo root:

```bash
python scripts/import_all_framework_mappings.py
```

Use selectively (or framework-specific scripts) and confirm with test scripts like:

```bash
python scripts/test_framework_counts_full.py
```

---

If anything in this guide is unclear or out of date, open an issue or PR to keep onboarding smooth for the next developer.