# SaaS Partial-gap remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or implement task-by-task.

**Goal:** Close SaaS-lens Partial clusters (#8, #15, #16, #17) and API register parity (#2), without JWT active-org claim (perf: cookie+RLS stays).

**Architecture:** Request-cached `requireOrganizationIdForWrite()` gates mutating HR/payroll paths when `BILLING_ENABLED`; Vercel schedules billing-renewal; register API matches UI subscription create; health reports Billplz env only when billing on.

**Tech Stack:** Next.js `cache()`, Vitest, Playwright smoke, Vercel crons

## Global Constraints

- `BILLING_ENABLED !== "true"` → no subscription checks (zero overhead)
- Impersonation bypasses billing lock (platform support)
- Owner `/owner/billing` pay path must not call write gate
- No JWT active-org claim (defer — Edge perf)
- No global search (still deferred)

---

### Task 1: Billing write gate + cron

- [ ] Lightweight status query + `cache()` wrapper
- [ ] `requireOrganizationIdForWrite()` in organization-context
- [ ] Wire into payroll generate, create employee, leave apply, apply-behalf, approvals resolve
- [ ] Add `/api/cron/billing-renewal` to `vercel.json` (daily 01:00 UTC ≈ 09:00 MYT)

### Task 2: API register parity

- [ ] Accept planTier + billingInterval; call `createSubscriptionOnRegister`

### Task 3: Health + unit tests

- [ ] Billplz env present when SaaS + BILLING_ENABLED
- [ ] Unit tests for subscription gate logic

### Task 4: E2e + docs

- [ ] Playwright: SaaS register page shows plan picker (no live Billplz)
- [ ] CI saas-unit includes gate tests; findings → Done/Partial updates
