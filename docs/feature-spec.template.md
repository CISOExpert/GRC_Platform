# Feature Spec: <Feature Name>

> Owner: <Owner Name>
> Date: <YYYY-MM-DD>
> Status: <Draft | In Review | Approved>

---

## 1. Summary

Briefly describe the feature in 2–3 sentences.

- Goal: <What is the primary outcome?>
- Scope: <What is included / excluded?>

---

## 2. Context / Background

Explain why this feature exists.

- Problem: <What problem are we solving?>
- Users: <Which personas are impacted?>
- Related work: <Links to issues/PRs/docs, if any>
- Assumptions: <Key assumptions that affect the design>

---

## 3. Requirements

### 3.1 Functional Requirements

List user-visible behaviors and system capabilities.

- [ ] FR-1: <Functional requirement>
- [ ] FR-2: <Functional requirement>
- [ ] FR-3: <Functional requirement>

### 3.2 Non-Functional Requirements

Performance, scalability, reliability, usability, etc.

- [ ] NFR-1: <Non-functional requirement>
- [ ] NFR-2: <Non-functional requirement>
- [ ] NFR-3: <Non-functional requirement>

---

## 4. Data Model Changes

Describe changes to database schema, data flows, or APIs.

- New tables: <List or N/A>
- Modified tables/columns: <List or N/A>
- New relationships/foreign keys: <List or N/A>
- Migrations/patches required:
  - [ ] `supabase/migrations/<id>_<name>.sql`
  - [ ] `db/patches/<id>_<name>.sql`

Include example SQL or JSON payloads if helpful.

```sql
-- Example (replace with real migration sketch)
-- ALTER TABLE <table_name>
--   ADD COLUMN <column_name> <type>;
```

---

## 5. Risks & Mitigations

Identify key risks (including security and data risks) and how we reduce them.

### 5.1 Security Risks

- [ ] <Risk description> — Mitigation: <Mitigation steps>
- [ ] <Risk description> — Mitigation: <Mitigation steps>

Consider:
- Authentication & authorization impacts
- Data exposure (PII, secrets, logs)
- Injection or abuse vectors (SQL, XSS, CSRF, etc.)

### 5.2 Data Integrity & Operational Risks

- [ ] <Risk description> — Mitigation: <Mitigation steps>
- [ ] <Risk description> — Mitigation: <Mitigation steps>

Consider:
- Incorrect migrations or backfills
- Data loss or duplication
- Backwards compatibility and rollbacks

---

## 6. Rollout & Monitoring

Describe how this feature will be released and observed in production.

### 6.1 Rollout Plan

- [ ] Dev: <Steps to enable/verify in dev_db>
- [ ] Stage: <Steps to enable/verify in stage_db>
- [ ] Prod: <Steps to enable/verify in prod_db>

Include any feature flags, config toggles, or phased rollout approaches.

### 6.2 Monitoring & Alerting

- Metrics to watch: <List of KPIs/metrics>
- Logs/dashboards: <Links or descriptions>
- Alert conditions: <When should we be paged/notified?>

---

## 7. Test Plan

Outline how we will validate the feature.

### 7.1 Automated Tests

- [ ] Unit tests: <Files / areas to cover>
- [ ] Integration tests: <APIs, DB interactions>
- [ ] End-to-end tests: <Core user flows>

```bash
# Example test commands (update as needed)
npm test
npm run lint
python scripts/test_<something>.py
```

### 7.2 Manual / Exploratory Testing

- [ ] Scenario 1: <User flow / expected behavior>
- [ ] Scenario 2: <User flow / expected behavior>
- [ ] Edge cases: <Boundary/negative cases>

### 7.3 Data Validation

- [ ] Pre-deploy checks: <SELECT queries or scripts>
- [ ] Post-deploy checks: <SELECT queries or scripts>

---

## 8. Open Questions / Follow-Ups

List unresolved decisions or future enhancements.

- [ ] <Open question or follow-up item>
- [ ] <Open question or follow-up item>
