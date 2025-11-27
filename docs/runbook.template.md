# Runbook: <Service / Component Name>

> Owner: <Team / Individual>
> Primary On-call: <Slack / Email / Pager>
> Last Updated: <YYYY-MM-DD>

---

## 1. Overview

Brief summary of what this service/component does and why it exists.

- Purpose: <High-level description>
- Criticality: <Low / Medium / High>
- Users / Consumers: <Internal services, teams, external users>

---

## 2. Dependencies

List upstream and downstream dependencies.

- Upstream services:
  - <Database / API / queue / third-party>
- Downstream services:
  - <Services that depend on this one>
- Infrastructure:
  - <Kubernetes cluster / VM / ECS service / Function>
- Config / Secrets:
  - <Env vars, config files, secret stores>

> Note: When troubleshooting, always consider whether a dependency is degraded before assuming this service is at fault.

---

## 3. Normal Operations

How to verify the service is healthy under normal conditions.

### 3.1 Health Checks

- [ ] Check health endpoint: `<GET https://<host>/health or similar>`
- [ ] Verify status page / uptime monitor: `<status page URL>`
- [ ] Confirm no active alerts for this service in `<alerting system>`.

### 3.2 Functional Checks

- [ ] Run a simple read-only request: `<curl / API call / UI action>`
- [ ] Confirm expected data appears in the UI or API response.
- [ ] Validate that background jobs (if any) are processing normally.

### 3.3 Capacity & Performance

- [ ] Check CPU / memory usage within normal thresholds.
- [ ] Verify error rate and latency are within SLOs.
- [ ] Confirm queue depths (if applicable) are stable.

---

## 4. Common Issues & Playbooks

Document the most likely issues and step-by-step responses.

### 4.1 <Issue Type 1>

**Symptoms**
- <How this issue shows up: alerts, logs, user reports>

**Immediate Actions**
- [ ] Step 1: <Check X>
- [ ] Step 2: <Gather logs/metrics>
- [ ] Step 3: <Mitigate impact (e.g., scale up, restart, failover)>

**Root Cause Investigation**
- [ ] Inspect `<logs / traces>` for <pattern>
- [ ] Verify `<dependency>` health
- [ ] Check recent deploys / config changes

**Longer-term Fixes**
- [ ] <Add guardrails / rate limits / retries>
- [ ] <Fix bug / data issue>

---

### 4.2 <Issue Type 2>

**Symptoms**
- <Description>

**Immediate Actions**
- [ ] Step 1: <Action>
- [ ] Step 2: <Action>

**Root Cause Investigation**
- [ ] <Investigation steps>

**Longer-term Fixes**
- [ ] <Preventative measures>

---

### 4.3 <Add more issue playbooks as needed>

---

## 5. Escalation Paths

Who to contact and in what order when something goes wrong.

- Primary On-call: `<Name / Rotation / Channel>`
- Secondary On-call / Backup: `<Name / Team>`
- Product / Business Owner: `<Name / Contact>`
- Platform / SRE: `<Team / Channel>`
- Security (for incidents involving data/security): `<Team / Channel>`

**Escalation Guidelines**

- Escalate immediately when:
  - [ ] User data loss is suspected.
  - [ ] Regulatory / compliance impact is possible.
  - [ ] Service is hard down for > <X> minutes.
- When escalating, include:
  - [ ] Summary of impact (who/what is affected).
  - [ ] Timeline of events so far.
  - [ ] Steps already taken and their outcomes.

---

## 6. Dashboards / Logs / Metrics Links

Add links to all relevant observability assets.

- Dashboards:
  - <Dashboard Name> – `<URL>`
  - <Dashboard Name> – `<URL>`

- Logs:
  - <Log Query / Saved View> – `<URL>`

- Traces:
  - <Tracing Service / View> – `<URL>`

- Alerts:
  - <Alert Policy / Notification Channel> – `<URL>`

---

## 7. Runbook Change History

Track significant updates to this runbook.

- <YYYY-MM-DD> – <Author> – <Summary of changes>
- <YYYY-MM-DD> – <Author> – <Summary of changes>
