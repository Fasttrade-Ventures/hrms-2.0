# Phase 6 — Enterprise tier implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all five Enterprise modules (Integrations, Analytics, API, Payouts, Recruitment) for commercial pilot readiness.

**Architecture:** Foundation-first build order reusing `webhook_outbox`, `integration_connections`, HMAC signing, `buildSimplePdf`, and bank export parsers. One migration `20260728200000_phase6_enterprise.sql`; entitlement gates via `requireModule()`.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres + RLS, `@hrms/platform` entitlements, `decimal.js` (payout amounts), existing `buildSimplePdf` / bank export helpers.

**Spec:** [2026-07-28-phase6-enterprise-design.md](../specs/2026-07-28-phase6-enterprise-design.md)

## Global Constraints

- Enterprise modules gated: `integrations`, `analytics`, `api`, `payouts`, `recruitment`
- Analytics roles: `director`, `organization_owner`, `hr_administrator`
- API key management: `organization_owner`, `hr_administrator`
- Webhook events v1: audit, employee, leave, payroll.payrun_locked, recruitment.offer_accepted
- API v1 read-only; auth header `Authorization: Bearer hrms_live_<secret>`
- Payouts: manual status + Maybank/CIMB response upload; reference `PAY-{period}-{employee_number}`
- Recruitment hire: offer accepted → `employees.status = 'draft'`; activation only on explicit HR action
- Vercel Hobby: webhook cron daily (`0 10 * * *` UTC) — already configured
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test` before each module commit

---

## File map (overview)

| Module | New lib | New routes | New UI |
|--------|---------|------------|--------|
| Integrations | `lib/integrations/webhooks/*` | cron reuse | `/hr/integrations/webhooks` |
| Analytics | `lib/analytics/queries.ts` | `/director/analytics`, `/hr/analytics` | `components/analytics/*` |
| API | `lib/api/*` | `/api/v1/*` | `/hr/integrations/api` |
| Payouts | `lib/payouts/*` | — | payrun detail panel |
| Recruitment | `lib/recruitment/*` | `/hr/recruitment/*` | kanban + offer forms |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260728200000_phase6_enterprise.sql`

**Interfaces:**
- Produces: all Phase 6 tables with RLS policies

- [ ] **Step 1:** Create migration with tables from spec §3.3, §5.4, §6.3, §7.3
- [ ] **Step 2:** Add `endpoint_id uuid references webhook_endpoints(id)` nullable to `webhook_outbox`
- [ ] **Step 3:** Add indexes: `(organization_id, status)` on payout items, `(requisition_id, stage)` on applications
- [ ] **Step 4:** Apply locally: `supabase db push` or `supabase migration up`
- [ ] **Step 5:** Commit: `feat(db): add Phase 6 enterprise tables`

---

### Task 2: Integrations — webhook registry core

**Files:**
- Create: `apps/web/src/lib/integrations/webhooks/types.ts`
- Create: `apps/web/src/lib/integrations/webhooks/sign.ts`
- Create: `apps/web/src/lib/integrations/webhooks/dispatch.ts`
- Create: `apps/web/src/lib/integrations/webhooks/queries.ts`
- Modify: `apps/web/src/lib/audit/webhooks.ts` — delegate to dispatch layer
- Modify: `apps/web/src/lib/audit/log-event.ts` — use `queueWebhookEvent`
- Test: `tests/integrations/webhook-sign.test.ts`

**Interfaces:**
- Produces: `queueWebhookEvent({ organizationId, eventType, payload, idempotencyKey? })`
- Produces: `signWebhookPayload(secret, body, timestamp)` → hex HMAC-SHA256

- [ ] **Step 1:** Write failing test for HMAC sign + verify
- [ ] **Step 2:** Implement `sign.ts` (mirror BukuCloud pattern)
- [ ] **Step 3:** Implement `dispatch.ts` — load active endpoints matching `events_filter`, upsert `webhook_outbox`
- [ ] **Step 4:** Refactor `processWebhookOutbox` to sign per-endpoint secret
- [ ] **Step 5:** Wire `logAuditEvent` → `queueWebhookEvent('audit.*', ...)`
- [ ] **Step 6:** Commit: `feat(integrations): webhook registry dispatch layer`

---

### Task 3: Integrations — HR lifecycle event hooks

**Files:**
- Modify: `apps/web/src/app/(hr)/hr/employees/actions.ts`
- Modify: `apps/web/src/lib/employee/leave.ts` (or leave actions)
- Modify: `apps/web/src/lib/payroll/workflow.ts` (`lockPayrun`)
- Test: `tests/integrations/webhook-events.test.ts`

- [ ] **Step 1:** Emit `employee.created` / `employee.updated` / `employee.deactivated` from employee actions
- [ ] **Step 2:** Emit `leave.submitted` / `leave.approved` / `leave.rejected`
- [ ] **Step 3:** Emit `payroll.payrun_locked` in `lockPayrun`
- [ ] **Step 4:** Write integration test asserting outbox row created with correct `event_type`
- [ ] **Step 5:** Commit: `feat(integrations): HR lifecycle webhook events`

---

### Task 4: Integrations — webhook management UI

**Files:**
- Create: `apps/web/src/app/(hr)/hr/integrations/page.tsx` (hub)
- Create: `apps/web/src/app/(hr)/hr/integrations/webhooks/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/integrations/webhooks/actions.ts`
- Create: `apps/web/src/components/hr/integrations/webhook-endpoint-form.tsx`
- Modify: `apps/web/src/lib/portal-nav.ts` — Integrations nav group
- Modify: `apps/web/src/components/hr/audit/audit-settings-forms.tsx` — link to webhooks

- [ ] **Step 1:** Hub page listing BukuCloud, Webhooks, API keys cards
- [ ] **Step 2:** Webhook CRUD form (name, URL, secret, event checkboxes)
- [ ] **Step 3:** Delivery log table (last 50 outbox rows for org)
- [ ] **Step 4:** Migrate SIEM config reader to `webhook_endpoints`; one-time migration script in migration SQL
- [ ] **Step 5:** `requireModule('integrations')` on all routes
- [ ] **Step 6:** Commit: `feat(integrations): webhook management UI`

---

### Task 5: Analytics — query layer

**Files:**
- Create: `apps/web/src/lib/analytics/queries.ts`
- Create: `apps/web/src/lib/analytics/types.ts`
- Test: `tests/analytics/queries.test.ts`

**Interfaces:**
- Produces: `getHeadcountMetrics(orgId)`, `getLeaveLiabilityMetrics(orgId)`, `getPayrollCostMetrics(orgId)`

- [ ] **Step 1:** Write tests with mocked Supabase responses
- [ ] **Step 2:** Implement headcount + branch/department breakdown
- [ ] **Step 3:** Implement leave liability (entitlement − used − pending)
- [ ] **Step 4:** Implement payroll cost from last locked payrun + YTD sum
- [ ] **Step 5:** Commit: `feat(analytics): server query layer`

---

### Task 6: Analytics — dashboard UI

**Files:**
- Create: `apps/web/src/components/analytics/analytics-dashboard.tsx`
- Create: `apps/web/src/app/(director)/director/analytics/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/analytics/page.tsx`
- Modify: `apps/web/src/app/(director)/director/dashboard/page.tsx` — redirect to analytics
- Modify: `apps/web/src/app/(owner)/owner/dashboard/page.tsx` — link to analytics
- Modify: `apps/web/src/lib/portal-nav.ts`

- [ ] **Step 1:** Shared `AnalyticsDashboard` with StatCard widgets
- [ ] **Step 2:** Director + HR pages with role + module gates
- [ ] **Step 3:** Replace director scaffold
- [ ] **Step 4:** Commit: `feat(analytics): HQ dashboard for Director and HR`

---

### Task 7: API — keys and auth middleware

**Files:**
- Create: `apps/web/src/lib/api/keys.ts`
- Create: `apps/web/src/lib/api/auth.ts`
- Create: `packages/validation/src/api-key.ts`
- Test: `tests/api/auth.test.ts`

**Interfaces:**
- Produces: `createApiKey(orgId, name, userId)` → `{ key: 'hrms_live_...', prefix }`
- Produces: `authenticateApiRequest(request)` → `{ organizationId, keyId } | null`

- [ ] **Step 1:** Zod schema for key name
- [ ] **Step 2:** `createApiKey` — generate secret, store SHA-256 hash, return once
- [ ] **Step 3:** `authenticateApiRequest` — parse Bearer/X-API-Key, lookup hash, check `revoked_at`
- [ ] **Step 4:** Tests for valid/invalid/revoked keys
- [ ] **Step 5:** Commit: `feat(api): API key issuance and auth`

---

### Task 8: API — v1 read routes + OpenAPI

**Files:**
- Create: `apps/web/src/app/api/v1/employees/route.ts`
- Create: `apps/web/src/app/api/v1/employees/[id]/route.ts`
- Create: `apps/web/src/app/api/v1/leave-requests/route.ts`
- Create: `apps/web/src/app/api/v1/payruns/route.ts`
- Create: `apps/web/src/app/api/v1/payruns/[id]/route.ts`
- Create: `apps/web/src/app/api/v1/payruns/[id]/items/route.ts`
- Create: `apps/web/src/app/api/v1/openapi.json/route.ts`
- Create: `apps/web/src/lib/api/handlers.ts`
- Test: `tests/api/v1-routes.test.ts`

- [ ] **Step 1:** Shared `withApiAuth(handler)` wrapper
- [ ] **Step 2:** Employees list + detail (paginated, org-scoped)
- [ ] **Step 3:** Leave requests list
- [ ] **Step 4:** Payruns list + detail + items
- [ ] **Step 5:** Static OpenAPI JSON matching routes
- [ ] **Step 6:** Commit: `feat(api): v1 read endpoints and OpenAPI`

---

### Task 9: API — management UI

**Files:**
- Create: `apps/web/src/app/(hr)/hr/integrations/api/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/integrations/api/actions.ts`
- Create: `apps/web/src/components/hr/integrations/api-keys-panel.tsx`

- [ ] **Step 1:** List active keys (prefix, name, last used, revoke button)
- [ ] **Step 2:** Create key form — show full secret once in modal
- [ ] **Step 3:** Role gate: owner + HR admin; `requireModule('api')`
- [ ] **Step 4:** Commit: `feat(api): API key management UI`

---

### Task 10: Payouts — batch creation on lock

**Files:**
- Create: `apps/web/src/lib/payouts/batches.ts`
- Create: `apps/web/src/lib/payouts/types.ts`
- Modify: `apps/web/src/lib/payroll/workflow.ts` — create batch on lock
- Test: `tests/payouts/batches.test.ts`

**Interfaces:**
- Produces: `createPayoutBatchForPayrun(payrunId, bankFormat)` → batch + items

- [ ] **Step 1:** On `lockPayrun`, seed `payrun_payout_items` from payrun items with `pending` status
- [ ] **Step 2:** Reference field: `PAY-{period}-{employee_number}`
- [ ] **Step 3:** Test batch seeding
- [ ] **Step 4:** Commit: `feat(payouts): auto-create payout batch on payrun lock`

---

### Task 11: Payouts — reconciliation UI + parsers

**Files:**
- Create: `apps/web/src/lib/payouts/parse-response.ts`
- Create: `apps/web/src/lib/payouts/reconcile.ts`
- Create: `apps/web/src/components/hr/payroll/payrun-payout-panel.tsx`
- Modify: `apps/web/src/app/(hr)/hr/payroll/[payrunId]/page.tsx`
- Test: `tests/payouts/parse-response.test.ts`

- [ ] **Step 1:** Parser for Maybank pipe-delimited + CIMB CSV response formats
- [ ] **Step 2:** Match rows by reference; update item status `paid`/`failed`
- [ ] **Step 3:** Manual bulk + per-row status actions
- [ ] **Step 4:** Upload response file form on payrun detail
- [ ] **Step 5:** `requireModule('payouts')`
- [ ] **Step 6:** Commit: `feat(payouts): reconciliation panel and bank response parser`

---

### Task 12: Recruitment — data layer

**Files:**
- Create: `apps/web/src/lib/recruitment/types.ts`
- Create: `apps/web/src/lib/recruitment/requisitions.ts`
- Create: `apps/web/src/lib/recruitment/applications.ts`
- Create: `apps/web/src/lib/recruitment/offers.ts`
- Create: `packages/validation/src/recruitment.ts`
- Test: `tests/recruitment/stages.test.ts`

**Interfaces:**
- Produces: `moveApplicationStage(applicationId, toStage, userId)`
- Produces: `acceptOffer(offerId, userId)` → `{ employeeId }`

- [ ] **Step 1:** Zod schemas for requisition, candidate, offer
- [ ] **Step 2:** CRUD for requisitions and applications
- [ ] **Step 3:** Stage transition with history log
- [ ] **Step 4:** Tests for valid/invalid stage moves
- [ ] **Step 5:** Commit: `feat(recruitment): data layer and stage transitions`

---

### Task 13: Recruitment — offer PDF + hire handoff

**Files:**
- Create: `apps/web/src/lib/recruitment/offer-pdf.ts`
- Modify: `apps/web/src/lib/recruitment/offers.ts`
- Modify: `apps/web/src/app/(hr)/hr/employees/actions.ts` — support draft status banner

- [ ] **Step 1:** `buildOfferPdf({ candidate, offer, orgName })` using `buildSimplePdf`
- [ ] **Step 2:** Store PDF via existing files upload helper
- [ ] **Step 3:** `acceptOffer` creates draft employee, links `employee_id`, sets stage `hired`
- [ ] **Step 4:** Emit `recruitment.offer_accepted` webhook
- [ ] **Step 5:** Signed PDF upload optional field on offer
- [ ] **Step 6:** Commit: `feat(recruitment): offer PDF and draft employee handoff`

---

### Task 14: Recruitment — UI

**Files:**
- Create: `apps/web/src/app/(hr)/hr/recruitment/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/recruitment/[requisitionId]/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/recruitment/actions.ts`
- Create: `apps/web/src/components/hr/recruitment/recruitment-pipeline.tsx`
- Create: `apps/web/src/components/hr/recruitment/offer-form.tsx`
- Modify: `apps/web/src/lib/portal-nav.ts`

- [ ] **Step 1:** Requisition list + create form
- [ ] **Step 2:** Kanban pipeline board by stage
- [ ] **Step 3:** Application detail drawer/page with stage buttons
- [ ] **Step 4:** Offer form + PDF preview/download + signed upload
- [ ] **Step 5:** Accept offer → redirect to employee edit with `?hired=1`
- [ ] **Step 6:** `requireModule('recruitment')`
- [ ] **Step 7:** Commit: `feat(recruitment): HR recruitment UI`

---

### Task 15: Seed data + roadmap update

**Files:**
- Modify: `scripts/seed-demo-data.ts` — sample requisition, webhook endpoint, analytics-friendly data
- Modify: `docs/superpowers/specs/2026-07-28-modules-roadmap-design.md` — Phase 6 status

- [ ] **Step 1:** Add demo recruitment pipeline (2 candidates, 1 offer draft)
- [ ] **Step 2:** Mark Phase 6 complete in roadmap when all tasks done
- [ ] **Step 3:** Run full `pnpm lint && pnpm typecheck && pnpm test`
- [ ] **Step 4:** Commit: `chore: seed Phase 6 demo data and update roadmap`

---

## Self-review (spec coverage)

| Spec § | Task |
|--------|------|
| §3 Integrations | Tasks 2–4 |
| §4 Analytics | Tasks 5–6 |
| §5 API | Tasks 7–9 |
| §6 Payouts | Tasks 10–11 |
| §7 Recruitment | Tasks 12–14 |
| §9 Migration | Task 1 |
| §10 Testing | Per-task tests |
| §11 Success criteria | Task 15 verification |

No placeholders remain; types consistent across `queueWebhookEvent`, `authenticateApiRequest`, `acceptOffer`.
