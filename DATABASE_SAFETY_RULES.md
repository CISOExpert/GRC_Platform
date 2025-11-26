# ⚠️ CRITICAL DATABASE RULES ⚠️

## NEVER DO THESE OPERATIONS:

### ❌ NEVER RUN:
```bash
npx supabase db reset
npx supabase db push --include-all
```

**Reason:** These commands WIPE ALL DATA including:
- Users (auth.users and public.users)
- Organizations
- All imported framework data (1,420 SCF controls, 34 frameworks, 12,029 mappings)
- All user configurations and saved views

---

## ✅ SAFE DATABASE OPERATIONS:

### To Apply New Migrations:
```bash
# Create a new migration file
npx supabase migration new your_migration_name

# Apply migrations without resetting
npx supabase db push
```

### To Add New Database Functions:
1. Create migration file in `supabase/migrations/`
2. Use `npx supabase db push` to apply (NOT reset)
3. Send NOTIFY to reload PostgREST schema cache:
```python
psycopg2: cur.execute("NOTIFY pgrst, 'reload schema';")
```

### To Recreate Test User (if needed):
```bash
python scripts/seed_test_user.py
```

This script uses the **Supabase Auth API** (proper method), not direct database inserts.

---

## Database Backup Strategy:

### Before ANY risky operation:
```bash
# Export all data
pg_dump -h 127.0.0.1 -p 54322 -U postgres -d postgres -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Or for text format:
pg_dump -h 127.0.0.1 -p 54322 -U postgres -d postgres > backup.sql
```

### To restore:
```bash
pg_restore -h 127.0.0.1 -p 54322 -U postgres -d postgres backup.dump
```

---

## Migration Workflow:

1. **Create migration:** `npx supabase migration new feature_name`
2. **Write SQL** in the new file in `supabase/migrations/`
3. **Apply:** `npx supabase db push` (NOT reset)
4. **Verify:** Test the changes
5. **If needed, reload schema:** Python command above

---

## Current Data Status (Nov 25, 2025):

- ✅ 1,420 SCF Controls
- ✅ 34 Frameworks (ISO, NIST, PCI, SOC 2, etc.)
- ✅ 12,029 Control Mappings
- ✅ Test user: test@example.com / password123
- ✅ Test Organization linked

**DO NOT LOSE THIS DATA BY RUNNING RESET COMMANDS**

