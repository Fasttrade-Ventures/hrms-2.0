# Phase 6 — Enterprise tier design

**Date:** 28 Jul 2026  
**Status:** Approved  
**Scope:** Full Enterprise tier — Integrations, Analytics, API, Payouts, Recruitment  
**Related:** [modules roadmap](./2026-07-28-modules-roadmap-design.md) · Phase 7 payroll hardening follows Phase 6

---

## 1. Summary

Deliver all five Enterprise modules for commercial pilot readiness:

| Module | Deliverable |
|--------|-------------|
| **Integrations** | Org webhook registry + HMAC signing (HR lifecycle events) |
| **Analytics** | HQ dashboard — headcount, leave liability, payroll cost |
| **API** | REST API keys + OpenAPI; read-only employees/leave/payroll |
| **Payouts** | Bank payout reconciliation + payment status |
| **Recruitment** | Requisitions, extended pipeline, offer letters, hire handoff |

**Build order:** Integrations → Analytics → API → Payouts → Recruitment (foundation-first; recruitment depends on webhooks + employee handoff).

**Architecture:** Reuse `integration_connections`, `webhook_outbox`, BukuCloud HMAC patterns, `buildSimplePdf`, existing bank export builders, and `requireModule()` entitlement gates. New domain tables per module; UI under `/hr/*` with Director/Owner analytics surfaces.

---

## 2. Product decisions (28 Jul 2026)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Scope | Full Phase 6 — all five modules |
| 2 | Recruitment hire | **Hybrid** — offer accepted creates **draft employee**; HR completes profile before activation email |
| 3 | Recruitment pipeline | Applied → Screening → Interview → Assessment → Offer → Hired / Rejected / Withdrawn |
| 4 | Offer letters | **Template PDF** + optional **signed upload** |
| 5 | Integration events | Audit + employee + leave + locked payrun + offer accepted |
| 6 | Analytics access | Director + Organization Owner + HR Administrator |
| 7 | API key management | Organization Owner + HR Administrator |
| 8 | Payouts status | **Manual override** + optional **bank response file upload** (Maybank/CIMB) |
| 9 | API v1 scope | **Read-only** — employees, leave requests, payruns/items |
| 10 | Webhook delivery | Reuse `webhook_outbox` + daily cron (Hobby-safe schedule) |
| 11 | SIEM migration | Migrate existing audit SIEM config into general webhook registry |

---

## 3. Integrations

### 3.1 Goals

- Replace single-purpose SIEM config with a **multi-endpoint webhook registry**
- HMAC-signed outbound payloads (`X-HRMS-Signature`, `X-HRMS-Timestamp`)
- Event catalog for HR lifecycle (not attendance/approvals/documents in v1)

### 3.2 Event catalog

| Event | Trigger |
|-------|---------|
| `audit.*` | Existing audit events (filterable per endpoint) |
| `employee.created` | Employee record created |
| `employee.updated` | Employee profile updated |
| `employee.deactivated` | Employee status → inactive/terminated |
| `leave.submitted` | Leave request created |
| `leave.approved` | Leave request approved |
| `leave.rejected` | Leave request rejected |
| `payroll.payrun_locked` | Payrun locked |
| `recruitment.offer_accepted` | Candidate offer accepted |

### 3.3 Data model

```sql
-- webhook_endpoints (new)
id, organization_id, name, url, secret, events_filter text[], status, created_at, updated_at

-- webhook_outbox (existing) — add endpoint_id nullable FK
-- integration_connections provider=siem — migrate to webhook_endpoints; deprecate siem row
```

### 3.4 UI

- `/hr/integrations` — hub (BukuCloud, Webhooks, API keys)
- `/hr/integrations/webhooks` — CRUD endpoints, event filter checkboxes, test ping, delivery log (last 50 outbox rows)

### 3.5 Implementation notes

- `queueWebhookEvent({ organizationId, eventType, payload })` central dispatcher
- `processWebhookOutbox` signs with endpoint secret; retries with `MAX_WEBHOOK_ATTEMPTS`
- Audit SIEM settings at `/hr/audit/settings` redirect or embed link to webhook registry

---

## 4. Analytics

### 4.1 Goals

Replace Director dashboard scaffold with live HQ metrics. HR Admin and Owner get the same analytics surface.

### 4.2 Metrics (v1)

| Widget | Definition |
|--------|------------|
| **Headcount** | Active employees; breakdown by branch and department |
| **Headcount trend** | Net change last 6 months (joins − terminations) |
| **Leave liability** | Sum of (entitlement − used − pending) days × daily cost proxy (basic salary / working days) |
| **Payroll cost** | Last locked payrun gross/net; YTD locked payrun totals |
| **Open recruitment** | Open requisitions + candidates in pipeline (after Recruitment ships) |

### 4.3 Routes

| Route | Roles |
|-------|-------|
| `/director/analytics` | `director` + `requireModule("analytics")` |
| `/hr/analytics` | `hr_administrator` + module |
| Owner | Link from `/owner/dashboard` → `/hr/analytics` |

Replace `/director/dashboard` scaffold with redirect to `/director/analytics` or inline same component.

### 4.4 Data layer

- `lib/analytics/queries.ts` — server-side aggregations via Supabase
- No new tables; query `employees`, `leave_balances`/`leave_requests`, `payruns`, `payrun_items`

---

## 5. API

### 5.1 Goals

Enterprise REST API with org-scoped API keys and OpenAPI documentation.

### 5.2 Authentication

- Header: `Authorization: Bearer hrms_live_<secret>` or `X-API-Key: hrms_live_<secret>`
- Keys stored hashed (SHA-256); only prefix shown in UI after creation
- Scopes v1: `employees:read`, `leave:read`, `payroll:read` (all granted per key in v1)

### 5.3 Endpoints (read-only v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/employees` | Paginated employee directory |
| GET | `/api/v1/employees/{id}` | Employee detail |
| GET | `/api/v1/leave-requests` | Paginated leave requests |
| GET | `/api/v1/payruns` | Paginated payruns |
| GET | `/api/v1/payruns/{id}` | Payrun detail |
| GET | `/api/v1/payruns/{id}/items` | Payrun line items |
| GET | `/api/v1/openapi.json` | OpenAPI 3.1 spec (public, no auth) |

### 5.4 Data model

```sql
api_keys (
  id, organization_id, name, key_prefix, key_hash,
  scopes text[], created_by_user_id, last_used_at, revoked_at, created_at
)
```

### 5.5 UI

- `/hr/integrations/api` — create/revoke keys, copy secret once, list active keys
- Owner can access same page (role gate)

### 5.6 Rate limiting

- v1: 100 requests/minute per key (in-memory or simple DB counter; document for v2 Redis)

---

## 6. Payouts

### 6.1 Goals

Track bank payment status after payrun lock and bank file export.

### 6.2 Workflow

1. Payrun locked → HR generates bank file (existing export)
2. System creates `payrun_payout_batch` linked to payrun + export format
3. `payrun_payout_items` seeded per employee with `status: pending`
4. HR marks batch `submitted` when file sent to bank
5. HR uploads bank response file OR manually marks rows `paid` / `failed`
6. Parser matches `PAY-{period}-{employee_number}` reference from Maybank/CIMB formats

### 6.3 Data model

```sql
payrun_payout_batches (
  id, organization_id, payrun_id, bank_format, status,
  submitted_at, reconciled_at, created_at
)

payrun_payout_items (
  id, batch_id, payrun_item_id, employee_id,
  reference, amount, status, failure_reason, paid_at
)

payout_reconciliation_uploads (
  id, batch_id, file_path, parsed_rows, uploaded_by, created_at
)
```

### 6.4 UI

- Panel on `/hr/payroll/[payrunId]` — Payouts tab (gated `requireModule("payouts")`)
- Bulk actions: mark all paid, upload response file
- Per-row status override

### 6.5 Status enum

`pending` → `submitted` → `paid` | `failed` (manual override allowed at any stage)

---

## 7. Recruitment

### 7.1 Goals

End-to-end hiring: requisition → pipeline → offer → draft employee handoff.

### 7.2 Pipeline stages

`applied` → `screening` → `interview` → `assessment` → `offer` → terminal: `hired` | `rejected` | `withdrawn`

### 7.3 Data model

```sql
job_requisitions (
  id, organization_id, title, department_id, branch_id,
  headcount, employment_type, status, description, created_by, created_at
)

job_candidates (
  id, organization_id, full_name, email, phone, source, created_at
)

job_applications (
  id, requisition_id, candidate_id, stage, status,
  employee_id nullable, applied_at, stage_updated_at
)

job_application_stage_history (
  id, application_id, from_stage, to_stage, changed_by, notes, created_at
)

job_offers (
  id, application_id, job_title, basic_salary, start_date,
  status, generated_file_id, signed_file_id,
  sent_at, accepted_at, created_at
)
```

### 7.4 Offer letter flow

1. HR creates offer from application in `offer` stage
2. System generates PDF via `buildSimplePdf` (candidate name, role, salary, start date, org name)
3. Store in `files` table; link `generated_file_id`
4. HR can upload signed PDF → `signed_file_id`
5. Mark offer `sent` → candidate email (outbox) optional v1
6. Mark `accepted` → **hire handoff** (§7.5)

### 7.5 Hire handoff (hybrid)

On offer `accepted`:

1. Create `employees` row: `status = 'draft'`, prefill name/email/job title/branch/department/salary from offer
2. Set `job_applications.employee_id` and stage → `hired`
3. Emit `recruitment.offer_accepted` webhook
4. Redirect HR to `/hr/employees/{id}/edit?hired=1` with banner: *Complete profile before sending activation*
5. Activation email **only** when HR clicks existing “Send activation” on employee edit (no auto-send)

### 7.6 UI

- `/hr/recruitment` — requisition list + create
- `/hr/recruitment/[requisitionId]` — kanban board by stage
- `/hr/recruitment/[requisitionId]/candidates/[applicationId]` — detail, stage moves, offer form
- Nav: HR → Recruitment (gated `requireModule("recruitment")`)

---

## 8. Entitlements & navigation

All modules use existing `ModuleKey` values in `packages/platform/src/entitlements/types.ts`:

- `integrations`, `analytics`, `api`, `payouts`, `recruitment`

Update `portal-nav.ts`:

- HR → Integrations (hub)
- HR → Analytics
- HR → Recruitment
- Director → Analytics (replace scaffold dashboard)

Owner module toggles (`/owner/settings`) already list these keys.

---

## 9. Migrations

Single migration file: `20260728200000_phase6_enterprise.sql`

Tables: `webhook_endpoints`, `api_keys`, `payrun_payout_batches`, `payrun_payout_items`, `payout_reconciliation_uploads`, `job_requisitions`, `job_candidates`, `job_applications`, `job_application_stage_history`, `job_offers`

RLS: org-scoped via `current_user_org_ids()`; API keys service-role only for hash lookup.

---

## 10. Testing

| Area | Tests |
|------|-------|
| Integrations | HMAC sign/verify, event filter, outbox dispatch |
| API | Key auth, 401/403, pagination, OpenAPI schema valid |
| Payouts | Maybank/CIMB response parser, reference matching |
| Recruitment | Stage transitions, offer PDF, draft employee creation |
| Analytics | Query helpers with fixture data |

---

## 11. Success criteria

- [ ] Webhook registry replaces SIEM-only config; HR lifecycle events delivered
- [ ] Director analytics shows live metrics (no scaffold)
- [ ] API keys issue and authenticate against v1 read endpoints; OpenAPI published
- [ ] Locked payrun → payout batch → manual + file reconciliation
- [ ] Recruitment pipeline through offer accept → draft employee → HR activation flow
- [ ] All modules respect Enterprise entitlement + owner module toggles
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass

---

## 12. Out of scope (Phase 6)

- Attendance/approval/document webhook events (Phase 6+)
- API write endpoints
- Customizable recruitment stages per requisition
- Candidate self-service portal
- OAuth / third-party API consumers
- Real-time webhook delivery (daily cron on Hobby)
