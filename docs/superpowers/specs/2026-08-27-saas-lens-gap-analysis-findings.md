# SaaS-lens master-prompt gap analysis — findings

**Date:** 2026-08-27 · **Re-audit:** 2026-08-28 · **Remediation:** 2026-08-28  
**Status:** Partial clusters remediated (write gate, cron, API register, health, e2e, RLS checks)  
**Design:** [2026-08-27-saas-lens-gap-analysis-design.md](./2026-08-27-saas-lens-gap-analysis-design.md)  
**Lens:** SaaS-first (option C · hybrid depth)  
**Complements:** Standalone findings (~9/10 KEEP)

**Verdict:** Standalone ~**9/10**. SaaS isolation ~**8.5–9/10**. Billplz billing ~**8/10** with `BILLING_ENABLED` (trial-first + write gate + scheduled renewal). JWT active-org claim intentionally deferred (cookie+RLS; better Edge perf).

---

## Scorecard (18 clusters · post-remediation 2026-08-28)

| # | Cluster | Class | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Product identity & modes | REFACTOR | **Done** | `DEPLOYMENT_MODE` gates UI |
| 2 | Identity & authentication | REFACTOR | **Done** | UI + `/api/register` create subscription |
| 3 | Tenancy & organization | REFACTOR | **Done** | `requireOrganizationId()` |
| 4 | Roles & permissions | KEEP | **Done** | Active-org cookie |
| 5 | Core HR domain | REFACTOR | **Done** | Session org |
| 6 | Payroll (Malaysia) | REFACTOR | **Done** | Multi-org cron + write gate |
| 7 | Entitlements & gating | KEEP | **Done** | DB tier + platform |
| 8 | Billing & payments | REFACTOR | **Done*** | Write gate + Billplz; pay-first FUTURE |
| 9 | Notifications & email | REFACTOR | **Done** | Multi-org crons |
| 10 | Files & media | REFACTOR | **Done** | Org-scoped R2 |
| 11 | Reporting / search / import | REFACTOR | **Done** | Session org; global search still deferred |
| 12 | Audit & platform admin | REFACTOR | **Done** | Impersonation + tenants |
| 13 | UX systems | REFACTOR | **Done** | Switcher + plan picker |
| 14 | Security & API hardening | KEEP | **Defer** | JWT claim skipped for Edge perf |
| 15 | Jobs / cron / observability | REFACTOR | **Done** | `billing-renewal` in `vercel.json`; Billplz health when billing on |
| 16 | Testing & CI | REFACTOR | **Done** | Gate unit + SaaS register e2e step + billing RLS structural |
| 17 | Docs & ops readiness | REFACTOR | **Done** | Ops notes + this findings pass |
| 18 | Public site / SEO / GEO | FUTURE | **Skip** | Intentional |

\*Done for trial-first GA path; pay-first / marketing / seat hard limits remain FUTURE.

**Summary:** 15 Done · 1 Done\* · 1 Defer · 1 FUTURE/Skip · **0 Partial**

---

## Performance notes (intentional)

| Choice | Why |
| --- | --- |
| No JWT active-org claim | Cookie validated against memberships; avoids Edge middleware crypto/JWT rewrite cost |
| Write gate only on mutations | Reads use `requireOrganizationId()` — no billing DB hit on dashboards |
| React `cache()` on status fetch | At most one lightweight `status/trial/period` select per request |
| `BILLING_ENABLED≠true` short-circuit | Zero subscription queries in standalone / billing-off SaaS |
| Impersonation bypass | Platform support without extra round-trips failing |

---

## FUTURE (unchanged)

- Public marketing / pricing page  
- Pay-first signup  
- Usage metering / hard seat limits  
- JWT active-org claim (optional later)

---

## Plans

- [2026-08-28-saas-partial-gap-remediation.md](../plans/2026-08-28-saas-partial-gap-remediation.md)  
- Billing design: [2026-08-27-billplz-saas-billing-design.md](./2026-08-27-billplz-saas-billing-design.md)  
- Ops: [docs/saas-ops-notes.md](../../saas-ops-notes.md)
