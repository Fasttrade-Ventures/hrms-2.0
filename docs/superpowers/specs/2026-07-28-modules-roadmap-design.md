# HRMS modules roadmap — Jul 2026

Phased plan to complete pending portals, Pro/Enterprise add-ons, payroll engineering hardening, and the audit module.

## Phase 0 — Demo data & dashboard honesty ✅

| Item | Status |
|------|--------|
| `pnpm seed-demo-data` — salaries, documents, attendance, approvals, performance, audit | ✅ Done |
| Remove HR dashboard placeholder queue/metrics | ✅ Done |
| Manager reporting lines + branch assignments in seed | ✅ Done |

**Run after fresh org setup:**

```bash
pnpm seed-org-catalogs
pnpm seed-payroll-rules
pnpm seed-role-accounts --password 'DemoPass123!'
pnpm seed-demo-data
```

---

## Phase 1 — Role portals (Core) ✅

| Portal | Scope | Status |
|--------|--------|--------|
| **Branch Admin** | Branch-scoped dashboard, employees/docs/calendar via shared HR pages | ✅ Done |
| **Organization Owner** | Org health, module entitlements, links to HR ops | ✅ Done |
| **Platform Admin** | Tenant list, provisioning, impersonation (SaaS) | ✅ Done |

### Phase 1b ✅

- Branch-scoped employee directory (`/branch-admin/employees`) | ✅ Done |
- Owner module toggle UI (persist to `organizations.module_flags`) | ✅ Done |
- Platform tenant provisioning + impersonation (SaaS only) | ✅ Done |

Platform tools (`DEPLOYMENT_MODE=saas`):
- `/platform/tenants` — provision tenant + enter as owner
- Impersonation cookie + banner; redirects to `/owner/dashboard`
- Self-service `/api/register` shares `provisionTenant()` logic

---

## Phase 2 — Performance module (Core) ✅

| Item | Status |
|------|--------|
| HR review cycle CRUD (`/hr/performance`) | ✅ Done |
| Launch appraisals for active employees | ✅ Done |
| Employee self-appraisal UI wiring | ✅ Done |
| Manager review UI wiring | ✅ Done |
| Cycle close + ratings export | ✅ Done |

---

## Phase 3 — Announcements (Core) ✅

Already shipped: `AnnouncementComposeForm` with rich editor, audience targeting, draft/publish/schedule modes at `/hr/announcements`.

Polish completed:

- Attachment upload UX in editor (drag-drop, validation, remove before save) | ✅ Done |
- Preview before publish | ✅ Done |
- Scheduled publish cron job (`/api/cron/announcements`, daily 07:00 UTC) | ✅ Done |
- Deferred notifications until `display_from` via `notifications_sent_at` | ✅ Done |

---

## Phase 4 — Audit module ✅

### Current state

- `audit_events` table + `logAuditEvent()` across employees, assets, payroll exports, auth
- HR read-only list at `/hr/audit` with action/resource filters ✅
- Gated by Enterprise `audit` module entitlement ✅

### Commercial-grade audit

| # | Capability | Status |
|---|------------|--------|
| A1 | Actor resolution (user name, employee number) in list | ✅ Done |
| A2 | Date range + pagination (cursor) | ✅ Done |
| A3 | CSV export for auditors | ✅ Done |
| A4 | Dedicated **auditor** portal path `/auditor/audit` (permission-only, no HR role) | ✅ Done |
| A5 | Coverage expansion: payrun workflow, approval actions, document downloads, announcements, performance, owner settings | ✅ Done |
| A6 | Immutable retention policy + archive to cold storage | ✅ Done |
| A7 | SIEM webhook (Enterprise integrations) | ✅ Done |

Settings UI: `/hr/audit/settings` (retention, archive toggle, SIEM webhook config).

Cron jobs:
- `/api/cron/audit-archive` — weekly cold storage export
- `/api/cron/audit-siem` — webhook delivery every 5 minutes

### Audit event taxonomy (target)

```
auth.login | auth.logout | auth.password_reset
employee.created | employee.updated | employee.deactivated
approval.submitted | approval.approved | approval.rejected
payroll.payrun_created | payroll.payrun_locked | payroll.export_generated
document.uploaded | document.downloaded
asset.assigned | asset.returned
```

---

## Phase 5 — Professional tier ✅

| Module | Deliverable | Status |
|--------|-------------|--------|
| GPS / geofencing | Branch geofence config + attendance validation overlay | ✅ Done |
| Rosters | `/hr/organization/rosters` + employee schedule view | ✅ Done |
| Document expiry cron | Daily job → outbox email (template exists in platform mail) | ✅ Done |
| Scheduled reports | Report subscriptions table + cron dispatcher | ✅ Done |

Settings:
- Branch geofence: **Organization → Branches → Edit**
- Rosters: **Organization → Rosters**
- Employee schedule: **Employee → My schedule**
- Report subscriptions: subscribe from any report runner page

Cron: `/api/cron/report-subscriptions` (daily 06:00 UTC)

Standalone deployments default to **Enterprise** tier via `PRODUCT_TIER=enterprise` and `pnpm upgrade-standalone-tier`.

---

## Phase 6 — Enterprise tier ✅

**Spec:** [2026-07-28-phase6-enterprise-design.md](./2026-07-28-phase6-enterprise-design.md)  
**Plan:** [2026-07-28-phase6-enterprise.md](../plans/2026-07-28-phase6-enterprise.md)

| Module | Deliverable | Status |
|--------|-------------|--------|
| Integrations | Webhook registry + HMAC signing (HR lifecycle events) | ✅ |
| Analytics | HQ dashboard — headcount, leave liability, payroll cost | ✅ |
| API | REST keys + OpenAPI (employees/leave/payroll read) | ✅ |
| Payouts | Bank file reconciliation + payment status | ✅ |
| Recruitment | Requisitions, pipeline, offer letters, draft hire handoff | ✅ |

### Locked decisions

- Recruitment: extended pipeline; offer → draft employee; HR activates manually
- Offer letters: template PDF + signed upload
- Webhooks: audit + employee + leave + payrun locked + offer accepted
- Analytics: Director + Owner + HR Admin
- API keys: Owner + HR Admin
- Payouts: manual status + Maybank/CIMB response upload

---

## Phase 7 — Payroll engineering hardening ✅

| Item | Status | Notes |
|------|--------|-------|
| Live DB integration tests | ✅ | `tests/integration/payroll-lifecycle.test.ts` (`PAYROLL_INTEGRATION=1`) |
| Runtime rule-pack wiring | ✅ | `statutory_rule_versions.payload` → `StatutoryRuleContext` in pipeline |
| Export spec validation | ✅ | KWSP/PERKESO fixtures + PERKESO ASSIST v2 278-char layout |
| Golden tests on `pcbMtdFull` | ✅ | `payroll-golden.test.ts` uses production PCB path |

Run integration tests locally:

```bash
supabase start
eval "$(supabase status -o env)"
export PAYROLL_INTEGRATION=1
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export DEFAULT_ORGANIZATION_ID=00000000-0000-4000-8000-000000000001
pnpm test:payroll-integration
```

---

## Recommended build order

1. Phase 0 ✅
2. Phase 1b ✅
3. Phase 2–5 ✅
4. **Phase 6** — Enterprise ✅
5. **Phase 7** — Payroll engineering hardening ✅

---

## Success criteria

- HR dashboard shows **only live metrics** after `seed-demo-data`
- Branch Admin, Owner, Platform dashboards usable without scaffold placeholders
- Auditor can export filtered audit trail without HR administrator role
- Payroll CI includes at least one full draft→lock→YTD test against real Postgres
