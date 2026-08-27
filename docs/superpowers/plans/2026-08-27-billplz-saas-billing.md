# Billplz SaaS billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SaaS-only subscription billing via Billplz (Option A pricing, monthly/annual, 14-day trial), syncing to `product_tier` entitlements.

**Architecture:** Postgres subscription ledger + Billplz bills per charge; webhook activates tier; cron renews monthly/annual and bills overage; standalone unchanged.

**Tech Stack:** Next.js server actions, Supabase, Billplz API v4, Vitest, existing notification outbox

**Spec:** [2026-08-27-billplz-saas-billing-design.md](../specs/2026-08-27-billplz-saas-billing-design.md)

## Global Constraints

- `DEPLOYMENT_MODE=saas` only — gate all billing code with `isSaasMode()`
- Standalone: no Billplz, no subscription tables required for runtime
- Pricing: Option A — base (10 included) + overage; SST 8% on Billplz amount
- Trial: 14 days Professional features only; no free ≤3 staff tier
- Intervals: `month` or `year` (annual = 10× monthly base for 12 months)
- Overage on annual: monthly Billplz bills for staff > 10
- Do not break existing `requireOrganizationId()` / dual-mode flows
- Billplz webhook: X Signature verify; idempotent on `billplz_bill_id`

---

### Task 1: Schema + seed plans

**Files:**
- Create: `supabase/migrations/20260828120000_saas_billing.sql`
- Create: `apps/web/src/lib/billing/plans.ts` (seed constants mirror DB)

- [ ] **Step 1:** Migration: `billing_plans`, `organization_subscriptions`, `subscription_invoices`, `billplz_bills`, `billing_events`
- [ ] **Step 2:** Seed three plans (sen): Core 6900/69000/600; Pro 12900/129000/1200; Ent 17900/179000/1700; included_headcount=10
- [ ] **Step 3:** RLS: owner read own org; service role writes
- [ ] **Step 4:** `pnpm test` + apply migration locally

---

### Task 2: Billplz client (`packages/platform`)

**Files:**
- Create: `packages/platform/src/billing/billplz/client.ts`
- Create: `packages/platform/src/billing/billplz/signature.ts`
- Create: `packages/platform/src/billing/billplz/types.ts`
- Modify: `packages/platform/src/index.ts` (exports)

- [ ] **Step 1:** `createBill`, `getBill` wrappers (v4 collections/bills)
- [ ] **Step 2:** `verifyCallbackSignature` (X Signature)
- [ ] **Step 3:** Unit tests with fixture payloads in `tests/unit/billplz-signature.test.ts`

---

### Task 3: Pricing calculator

**Files:**
- Create: `apps/web/src/lib/billing/calculate-invoice.ts`
- Create: `tests/unit/billing-calculate-invoice.test.ts`

- [ ] **Step 1:** `calculateSubscriptionAmount({ tier, interval, activeEmployees })` → `{ subtotalSen, sstSen, totalSen, overageCount }`
- [ ] **Step 2:** Tests: 5/10/20/50 staff × monthly; annual base; SST rounding

---

### Task 4: Subscription service + webhook

**Files:**
- Create: `apps/web/src/lib/billing/subscriptions.ts`
- Create: `apps/web/src/lib/billing/sync-entitlements.ts`
- Create: `apps/web/src/app/api/webhooks/billplz/route.ts`

- [ ] **Step 1:** `createSubscriptionOnRegister(orgId, planTier)` → trialing
- [ ] **Step 2:** `createBillForInvoice(invoiceId)` → Billplz + redirect URL
- [ ] **Step 3:** Webhook: verify signature → mark paid → `syncEntitlementsFromSubscription`
- [ ] **Step 4:** Integration test with mocked Billplz HTTP

---

### Task 5: Register + trial wiring

**Files:**
- Modify: `apps/web/src/app/(auth)/auth/register/actions.ts`
- Modify: `apps/web/src/app/(auth)/auth/register/register-form.tsx`

- [ ] **Step 1:** Plan picker (Core / Pro / Enterprise) + interval toggle (month/year)
- [ ] **Step 2:** After provision → create subscription trialing (Professional modules during trial regardless of selected tier, or trial always Pro — spec: Professional features)
- [ ] **Step 3:** Trial banner in `portal-shell` / owner dashboard

---

### Task 6: Owner billing UI

**Files:**
- Create: `apps/web/src/app/(owner)/owner/billing/page.tsx`
- Create: `apps/web/src/app/(owner)/owner/billing/actions.ts`
- Create: `apps/web/src/components/owner/billing-panel.tsx`

- [ ] **Step 1:** Show plan, interval, trial/end date, active employees, next bill estimate
- [ ] **Step 2:** “Pay now” / upgrade → create invoice + redirect Billplz
- [ ] **Step 3:** Invoice history table (paid/open)

---

### Task 7: Renewal cron + dunning

**Files:**
- Create: `apps/web/src/app/api/cron/billing-renewal/route.ts`
- Create: `apps/web/src/lib/billing/dunning.ts`
- Modify: `apps/web/src/lib/notifications/` (template `billing.invoice_ready`)

- [ ] **Step 1:** Daily cron: renewals for `active` subs past period end
- [ ] **Step 2:** Monthly overage bills for annual subs with staff > 10
- [ ] **Step 3:** `past_due` after grace; `requireActiveSubscription()` on mutating actions
- [ ] **Step 4:** Email owner with Billplz link via outbox

---

### Task 8: Platform + docs + CI

**Files:**
- Modify: `apps/web/src/app/(platform)/platform/tenants/page.tsx` (subscription status)
- Modify: `docs/saas-ops-notes.md`, `.env.example`
- Modify: `.github/workflows/ci.yml` (billing unit tests)

- [ ] **Step 1:** Tenant list shows subscription status + interval
- [ ] **Step 2:** Env vars documented; health optional Billplz check when `BILLING_ENABLED=true`
- [ ] **Step 3:** CI job for billing unit tests
- [ ] **Step 4:** `pnpm --filter @hrms/web typecheck` + `pnpm test`

---

## Out of scope (v1)

- Pay-first signup (`BILLING_SIGNUP_MODE=pay_first`)
- Free Core ≤3 employees
- Seat hard limits / metering
- Public marketing pricing page (#18 FUTURE)
- FPX auto-debit / Billplz recurring API (if added later)

---

## Verification

```bash
DEPLOYMENT_MODE=saas pnpm exec vitest run tests/unit/billing-calculate-invoice.test.ts tests/unit/billplz-signature.test.ts
pnpm --filter @hrms/web typecheck
pnpm test
```

Manual: register → trial banner → owner billing → Billplz sandbox pay → webhook → tier active.
