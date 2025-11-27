# Copilot Guidelines for This Repository

Audience: human developers and AI coding assistants (Copilot / LLMs) working in this repo.

---

## Project Overview

This repository contains the **GRC Unified Platform**, a SCF‑centric governance, risk, and compliance system. It provides:

- A **Next.js dashboard** for exploring Secure Controls Framework (SCF) controls, mappings, and organizations.
- A **Supabase/PostgreSQL backend** with a rich SCF data model (controls, assessment objectives, evidence templates, frameworks, mappings, organizations, saved views).
- A set of **Python import and test scripts** for loading SCF, NIST CSF, and other framework data into the database.
- Supabase **migrations** that define and evolve the database schema.

The primary user journeys today are:

- Exploring SCF controls and domains.
- Viewing and analyzing control mappings between SCF and many external frameworks.
- Managing organizations and their framework selections.
- Running data import / validation scripts during development.

---

## Tech Stack

**Languages**
- TypeScript for all frontend code.
- SQL (PostgreSQL) for migrations and views.
- Python for data import and maintenance scripts.

**Frontend**
- **Next.js (App Router)** in `frontend/`.
- React with functional components and hooks.
- Tailwind CSS + utility classes for styling.
- React Query (`@tanstack/react-query`) for server‑state management.

**Backend / Database**
- **PostgreSQL** via **Supabase** (SQL schema and migrations under `supabase/migrations/`).
- Rich SCF schema: `scf_controls`, `assessment_objectives`, `evidence_templates`, `frameworks`, `external_controls`, `scf_control_mappings`, `organizations`, `saved_views`, etc.

**Environments**
- `dev_db` – local Supabase/Postgres (development only).
- `stage_db` – staging environment.
- `prod_db` – production environment.

> Always assume that stage_db and prod_db contain **real or near‑real** data that must be protected.

---

## Dangerous Operations to Avoid

The following are **hard bans** for both humans and AI assistants:

- **Never** propose or execute `DROP DATABASE` in any environment.
- **Never** propose or execute `TRUNCATE` on any table in any environment.
- **Never** propose or execute full‑schema resets (e.g., `DROP SCHEMA public CASCADE`, dropping all tables, or recreating the entire database).
- **Never** run destructive operations (mass `DELETE` / `UPDATE` without a narrow `WHERE`) against **`stage_db`** or **`prod_db`**.
- **Never** assume it is safe to "start over" with data. Historical data and mappings are important.

If a task appears to require destructive changes, **stop and ask for confirmation**, and prefer additive/migratory patterns instead.

---

## Safe Patterns for Data Fixes

When asked to "fix the database", "clean up data", or "repair mappings", follow this workflow **exactly**:

1. **Inspect via read‑only `SELECT` queries**
   - Start with `SELECT`‑only statements to understand the issue.
   - Include clear filters (e.g., by framework code, control_id, date ranges).
   - Show counts and samples before suggesting any modifications.

2. **Implement a patch in `db/patches/` (or appropriate migration folder)**
   - Propose a **named, versioned script** instead of ad‑hoc SQL in the console.
   - Place patches in a clear location (e.g., `db/patches/2025XXXX_fix_scf_mappings.sql`), or as a Supabase migration in `supabase/migrations/` when it affects schema or widely‑used data.
   - Include comments at the top describing:
     - The problem being fixed.
     - The scope of the change.
     - Any assumptions or constraints.

3. **Make patches idempotent**
   - **Always** write patches so they can be safely run more than once.
   - Use patterns like:
     - `INSERT ... ON CONFLICT DO NOTHING`.
     - `UPDATE ... WHERE ... AND some_column != desired_value`.
     - `DO $$ BEGIN ... END $$;` blocks with `IF NOT EXISTS` guards.
   - Avoid relying on a particular initial state that may already have partially‑applied fixes.

4. **Use narrow, explicit `WHERE` clauses**
   - **Always** constrain updates and deletes by specific keys (e.g., framework code, control_id, id list).
   - Logically prove in comments why the WHERE clause only hits the intended rows.

5. **Prefer migrations/tooling over raw SQL in consoles**
   - Prefer:
     - Supabase migrations in `supabase/migrations/` for schema or global data changes.
     - Versioned patch scripts under `db/patches/` for targeted data fixes.
     - Python helpers/scripts in `scripts/` when complex logic is required.
   - **Avoid** manual SQL typed into a console with no history or review trail.

6. **Document and log**
   - Every patch script **must** contain comments explaining:
     - What was wrong.
     - What the script changes.
     - How to validate that it worked (e.g., sample `SELECT` queries).

---

## Coding Conventions

These conventions should be followed by humans and enforced by AI suggestions.

### General

- Prefer **TypeScript** over plain JavaScript in the frontend.
- Keep files focused: hooks in `frontend/lib/hooks/`, pages in `frontend/app/`, scripts in `scripts/`.
- Do not introduce new top‑level directories without a clear reason.

### React / Next.js

- Use **functional components** and **React hooks**.
- Prefer **server data via React Query hooks** (e.g., `useOrganizations`, `useFrameworks`, `useControlMappings`) instead of ad‑hoc `fetch` in components.
- Use **async/await** for asynchronous logic; avoid `.then().catch()` chains unless necessary.
- Co-locate UI components under their route (e.g., mapping explorer components under `frontend/app/(dashboard)/explore/frameworks/mappings/`).

### State & Data Fetching

- Use `@tanstack/react-query` for server state:
  - Define query keys in `frontend/lib/react-query/hooks.ts`.
  - Use `useQuery` for reads and `useMutation` for writes.
  - Always handle `{ data, error }` responses from Supabase; `if (error) throw error` is the standard pattern in hooks.
- Keep business logic inside hooks/utilities, not React components, whenever possible.

### Error Handling

- **Always** check for Supabase errors and throw them from hooks so React Query can surface them.
- In UI components, **handle loading and error states** explicitly (spinners, error messages).
- Avoid swallowing errors silently; at minimum, log them in development.

### Testing & Validation

- When modifying logic that affects counting, filtering, or mappings, **always**:
  - Provide example queries or code snippets that validate the behavior.
  - Where possible, add or propose tests (unit tests or small scripts in `scripts/test_*.py` / `test_*.js`).
- For significant features, prefer writing a small test script rather than manual one‑off checks.

### Style

- Follow existing formatting conventions (Prettier/ESLint defaults for the project).
- Use descriptive variable and function names (no single‑letter names except for trivial indexes).
- Keep components and hooks reasonably small and focused.

---

## How AI Assistants Should Help

These rules apply to Copilot, ChatGPT, and any other LLMs assisting in this repo.

### General Behavior

- **Always** respect the existing architecture and patterns before proposing new ones.
- **Never** invent new services, tools, or frameworks if suitable helpers already exist in the repo (e.g., use `useFrameworks` instead of creating a new Supabase call from scratch in a random component).
- **Prefer** incremental, well‑scoped changes over massive refactors.

### When Working With the Database

- **Always** start with **read‑only** `SELECT` queries to understand data shape or problems.
- **Never** propose `DROP DATABASE`, `TRUNCATE`, full‑schema resets, or destructive operations against `stage_db` or `prod_db`.
- When a fix is required, **always**:
  1. Propose read‑only diagnostics.
  2. Design an idempotent patch in `db/patches/` or a Supabase migration.
  3. Include comments and verification queries.

### When Writing or Modifying Code

- **Reuse existing hooks and utilities**:
  - For organizations: `useOrganizations`, related hooks.
  - For frameworks and mappings: `useFrameworks`, `useControlMappingsByFrameworkGrouped`, etc.
  - For dashboard stats: `useDashboardStats`.
- **Do not** bypass React Query or Supabase helpers unless there is a strong reason.
- **Suggest tests** or validation scripts when changing logic that affects counts, filtering, or data transformations.
- **Maintain compatibility** with TypeScript (provide correct typings, avoid `any` unless justified).

### Documentation & Communication

- When generating migrations, scripts, or complex changes, **always**:
  - Explain what you changed and why in a short summary.
  - Include usage instructions (e.g., commands to run a script or apply a migration).
- Prefer concise, high‑signal comments and docs over verbose explanations in code.

### Safety & Review

- Treat all suggestions as going through a code review:
  - Aim for clarity, safety, and maintainability.
  - Avoid speculative or untested patterns.
- If unsure about environment (dev vs stage vs prod), **assume production safety rules** and ask for clarification.

---

By following these guidelines, both human developers and AI assistants can work together safely and productively on the GRC Unified Platform, preserving data integrity while iterating quickly on features.