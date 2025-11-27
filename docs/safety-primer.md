# Safety Primer for Database & Stack Operations

## Stack Configuration
- **Language**: TypeScript
- **Framework**: Next.js 14 (App Router) + React 19
- **Database**: PostgreSQL (via Supabase)
- **Environment Setup**: Docker (Supabase local), deployed to AWS ECS/Fargate or EC2

### Database Environments
- `dev_db` (local) – Supabase running in Docker
- `stage_db` – (to be configured)
- `prod_db` – (to be configured)

## Hard Rules for Database Safety

❌ **Never propose or run:**
- `DROP DATABASE`
- `TRUNCATE`
- "reset all data" operations
- Any destructive operations without explicit confirmation

✅ **When asked to "fix database" or "clean up data":**
1. **First**: Generate **read-only** queries (`SELECT`) to understand the issue.
2. **Then**: Propose a **migration or patch script** in `supabase/migrations/` or `db/patches/` that is:
   - Idempotent (safe to run multiple times)
   - Narrowly scoped with clear `WHERE` clauses
   - Logged with comments explaining what it changes and why

### Preferred Patterns
- Prefer **migrations/patches** over ad-hoc destructive SQL.
- Prefer **tests and runbooks** over "quick hacks".
- Require **explicit user confirmation** before any data modification.

### Safety-First Approach
- Always show what will be affected **before** modifying data.
- Use **transactions** where appropriate.
- Include **rollback procedures** when feasible.
- Document the **rationale and scope** in migration or patch files.

---

*Last Updated: November 26, 2025*