# Database Patching Guidelines

This document governs **all database fixes and data corrections** for the GRC Unified Platform. It applies to humans and AI assistants alike.

The goals are:
- Protect production and staging data.
- Ensure every change is **auditable**, **reversible**, and **repeatable**.
- Prefer **small, well-documented patches** over ad-hoc destructive operations.

---

## Environments and Safety

We use three logical database environments:

- **`dev_db`** – Local development database (Supabase/Postgres on your machine).
  - Can be reset or modified aggressively when necessary.
  - Still, prefer patches and migrations for anything non-trivial.

- **`stage_db`** – Staging/pre-production.
  - Mirrors production schema and (usually) anonymized/representative data.
  - Used to validate migrations and patches before production.

- **`prod_db`** – Production.
  - Contains real (or near-real) customer and mapping data.
  - Must be treated as **read-mostly**; all changes should be minimal, vetted, and logged.

### Safety Rules

- **Never** run destructive operations (`DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, full-table `DELETE`) on **any** environment.
- **Never** run schema-changing or data-changing SQL manually against **`stage_db`** or **`prod_db`**.
- **Always** apply changes to `stage_db` and `prod_db` via:
  - Supabase migrations in `supabase/migrations/`, or
  - Versioned patch scripts in `db/patches/`.
- **Always** take or confirm backups/snapshots before impactful changes to `stage_db` or `prod_db`.

Destructive or experimental operations are allowed **only on `dev_db`**, and even there, prefer patch/migration patterns so changes are reproducible.

---

## Workflow for Fixing Data Issues

Use this workflow **for every data-related bug or correction**.

### 1. Reproduce / Describe the Bug

- Capture a clear description of the issue:
  - What is the symptom (UI bug, wrong count, missing record, etc.)?
  - Which tables, frameworks, or organizations appear affected?
  - How was it discovered (script, UI flow, test case)?
- If possible, link to a ticket, log entry, or screenshot.

### 2. Write Read-Only Queries to Understand Scope

Before changing **anything**, write `SELECT`-only queries:

```sql
-- Example: find SCF controls with duplicate mappings for a framework
SELECT scf_control_id, framework_id, COUNT(*) AS mapping_count
FROM scf_control_mappings
WHERE framework_id = :framework_id
GROUP BY scf_control_id, framework_id
HAVING COUNT(*) > 1
ORDER BY mapping_count DESC;
```

Guidelines:
- Use **narrow `WHERE` clauses** (e.g., specific framework codes, control IDs, organizations).
- Check **row counts** and **sample rows**.
- Save these queries in notes or a scratch file; they become your validation queries later.

### 3. Design an Idempotent Patch in `db/patches/`

Create a new patch file, for example:

- `db/patches/20251126_fix_duplicate_scf_mappings.sql`
- `db/patches/20251126_backfill_missing_applicability_flags.sql`

Design principles:

- **Idempotent**: safe to run more than once.
  - Use `INSERT ... ON CONFLICT DO NOTHING`.
  - Use `UPDATE ... WHERE ... AND column != desired_value`.
  - Use `DO $$ BEGIN ... IF NOT EXISTS (...) THEN ... END IF; END $$;` for conditional logic.
- **Narrowly scoped**: target only the affected rows.
  - Filter by `framework_id`, `control_id`, `organization_id`, etc.
  - Avoid "fix everything" patches unless absolutely necessary and well understood.

### 4. Add Logging and Comments

At the top of the patch file, document:

- **Why** the patch exists.
- **What** tables/columns it touches.
- **How** to verify success (reference the `SELECT` queries from step 2).

Within the SQL:
- Add `COMMENT` lines or inline comments for non-trivial logic.
- Optionally insert into a `maintenance_log` table if one exists (or log via Supabase monitoring).

### 5. Test in `dev_db`, Then `stage_db`, Then `prod_db`

1. **dev_db**
   - Apply the patch.
   - Run the validation `SELECT` queries.
   - Validate both the **data** and the **application behavior** (UI, scripts).

2. **stage_db**
   - Apply the same patch via your normal deployment/migration mechanism.
   - Repeat validation queries and smoke tests.

3. **prod_db**
   - After sign-off, apply the patch in a controlled window.
   - Re-run validation queries and confirm metrics/dashboards look correct.

At each step, if results differ from expectations, **stop**, update the patch (or create a follow-up patch), and re-test from `dev_db` upwards.

---

## Do / Don’t Table

| ✅ DO | ❌ DON’T |
|------|---------|
| **DO** use narrow `UPDATE`/`DELETE` with specific `WHERE` clauses. | **DON’T** run `UPDATE` or `DELETE` without a `WHERE` clause. |
| **DO** create versioned patches in `db/patches/` or Supabase migrations. | **DON’T** edit data manually in a console with no history. |
| **DO** make patches idempotent and safe to re-run. | **DON’T** assume the patch will only ever run once. |
| **DO** validate changes with `SELECT` queries before and after. | **DON’T** "fix" data blind without understanding current state. |
| **DO** take / confirm backups before impactful changes. | **DON’T** modify `stage_db` or `prod_db` without a rollback plan. |
| **DO** document intent and verification steps in comments. | **DON’T** leave cryptic patches with no explanation. |
| **DO** coordinate schema changes via migrations. | **DON’T** perform ad-hoc `ALTER TABLE` directly on production. |
| **DO** treat `stage_db` as production-like and test there. | **DON’T** treat `stage_db` as a sandbox to blow away. |
| **DO** use `INSERT ... ON CONFLICT DO NOTHING` for backfills. | **DON’T** use `TRUNCATE`, `DROP DATABASE`, or full-schema resets **anywhere**. |

---

## Patch Template

Use this template as a starting point for new patches. Adjust naming and details as needed.

```sql
-- File: db/patches/20251126_example_data_fix.sql
-- Purpose: Briefly describe the issue being fixed.
-- Context:
--   - What went wrong?
--   - Which tables/records are affected?
-- Validation:
--   - Pre-patch: SELECT ... to show the bad state.
--   - Post-patch: SELECT ... to confirm the fix.

BEGIN;

-- Example: Backfill missing applicability flags for specific SCF controls
-- Idempotent pattern: only update rows that are currently incorrect.

UPDATE scf_controls sc
SET applicability_people = TRUE
WHERE sc.control_id IN ('AAT-01.1', 'AAT-01.2')
  AND (sc.applicability_people IS DISTINCT FROM TRUE);

-- Example: Remove duplicate mappings for a specific framework in a safe way
-- 1. Identify duplicates into a temp table (dev_db) or CTE.
-- 2. Delete only the extra rows, not all mappings.

-- WITH duplicates AS (
--   SELECT MIN(id) AS keep_id, scf_control_id, framework_id
--   FROM scf_control_mappings
--   WHERE framework_id = :framework_id
--   GROUP BY scf_control_id, framework_id
-- )
-- DELETE FROM scf_control_mappings m
-- USING duplicates d
-- WHERE m.framework_id = d.framework_id
--   AND m.scf_control_id = d.scf_control_id
--   AND m.id <> d.keep_id;

COMMIT;
```

For more complex logic, you can wrap operations in a PL/pgSQL block:

```sql
DO $$
BEGIN
  -- Only insert if a specific record does not already exist
  IF NOT EXISTS (
    SELECT 1 FROM frameworks WHERE code = 'SCF' AND version = '2025.3.1'
  ) THEN
    INSERT INTO frameworks (id, code, name, version)
    VALUES (gen_random_uuid(), 'SCF', 'Secure Controls Framework', '2025.3.1');
  END IF;
END $$;
```

When using scripts (e.g., Python) instead of pure SQL, follow the **same principles**:
- Read-only inspection first.
- Idempotent updates.
- Narrow scope.
- Logged behavior and clear comments.

---

By following these guidelines, we keep `dev_db`, `stage_db`, and `prod_db` consistent, auditable, and safe while still moving quickly to correct data and schema issues.