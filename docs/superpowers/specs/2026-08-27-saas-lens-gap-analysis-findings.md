# SaaS-lens master-prompt gap analysis — findings

**Date:** 2026-08-27  
**Status:** Critical+High packages #1–6 implemented (see plan `docs/superpowers/plans/2026-08-27-saas-critical-high-remediation.md`). Billing/marketing/metering remain FUTURE.  
**Design:** [2026-08-27-saas-lens-gap-analysis-design.md](./2026-08-27-saas-lens-gap-analysis-design.md)  
**Lens:** SaaS-first (option C · hybrid depth)  
**Complements:** Standalone findings (~9/10 KEEP) — shared foundations stay strong; **app-layer tenancy remediation in progress toward SaaS GA**

**Verdict (pre-fix):** Under a SaaS / multi-tenant lens the product was roughly **~4–5/10 for multi-tenant GA**. Mode flags, register/provision, RLS dual-org tests, DB entitlements, and Platform tenants UI were real foundations. Safe SaaS was blocked by **systemic `DEFAULT_ORGANIZATION_ID` hardcoding**, **broken impersonation**, **thin new-tenant bootstrap**, and **missing org switcher**. Billing, marketing, metering remain **FUTURE packaging**.

**Verdict (post #1–6):** App-layer org resolution, impersonation middleware, provision catalog seed, multi-tenant crons, active-org switcher, and SaaS CI unit path are in place. Re-score multi-tenant GA after integration/e2e soak — expect **~7/10** isolation readiness (still no billing).

---

## Scorecard (18 clusters · SaaS lens)

| # | Cluster | Class | Severity | One-line |
| --- | --- | --- | --- | --- |
| 1 | Product identity & modes | REFACTOR | High | Mode gates register/platform nav, but domain still behaves like single-tenant |
| 2 | Identity & authentication | REFACTOR | High | Register works; no post-register session; multi-membership `maybeSingle` fragile |
| 3 | Tenancy & organization model | REFACTOR | **Critical** | ~80 app paths hardcode `DEFAULT_ORGANIZATION_ID`; effective org almost unused |
| 4 | Roles & permissions | KEEP | Medium | Role catalog solid; active-org role set missing for multi-membership |
| 5 | Core HR domain | REFACTOR | **Critical** | HR libs throw/filter on env org → wrong/empty data for new SaaS tenants |
| 6 | Payroll (Malaysia) | REFACTOR | **Critical** | Same env-org pattern; commercial checklist already “multi-org Not ready” |
| 7 | Entitlements & feature gating | KEEP | Medium | DB per-org tier works when org id is correct; Platform post-provision tier UI thin |
| 8 | Billing & payments | FUTURE | High | No Stripe/invoices/subscription lifecycle (intentional until isolation ships) |
| 9 | Notifications & email | REFACTOR | High | Global outbox OK; payslip/compliance crons often scoped to env org only |
| 10 | Files & media | REFACTOR | Medium | R2 `org/{id}/…` prefix OK; many writers still take env org |
| 11 | Reporting, search, export/import | REFACTOR | High | Runners hardcode env org; no global search (Defer) |
| 12 | Audit & platform administration | REFACTOR | **Critical** | Tenants UI KEEP; impersonation cookie ignored by middleware + RLS mismatch |
| 13 | UX systems | REFACTOR | Medium | No org switcher / tenant-aware empty states; register exists |
| 14 | Security & API hardening | KEEP | Medium | Dual-org RLS CI green for one-membership users; no active-org JWT claim |
| 15 | Jobs, cron, observability | REFACTOR | Medium | Health still treats `DEFAULT_ORGANIZATION_ID` as always required |
| 16 | Testing & CI | REFACTOR | High | RLS matrix OK; e2e/CI assume standalone; no SaaS register→use path |
| 17 | Documentation & ops readiness | REFACTOR | Medium | Features may oversell multi-tenant; no SaaS deploy/ops runbook |
| 18 | Public website / SEO / GEO | FUTURE | Medium | `/` → login only; no marketing/pricing |

**Summary:** 2 KEEP · 13 REFACTOR · 0 MISSING (signup→pay counted FUTURE) · 3 FUTURE-ish (8, 18, metering) — with **4 Critical** REFACTORs.

---

## Deep dives (Critical / High · REFACTOR | MISSING)

### D1 — App-layer org resolution · Critical · REFACTOR

- **Master-prompt:** §7 Tenant isolation, §86 multi-tenant  
- **Evidence:** `apps/web/src/lib/auth/organization-context.ts` (`getEffectiveOrganizationId`) used mainly by entitlements; ~80 files use sync `process.env.DEFAULT_ORGANIZATION_ID` (e.g. `payroll/queries.ts`, `employees/queries.ts`, `reports/context.ts`, `branch-admin/context.ts`)  
- **Gap:** SaaS without DEFAULT crashes; with DEFAULT all tenants collapse to one org.  
- **Impact:** Security / correctness — multi-tenant product is unsafe.  
- **Action:** Replace env helpers with async effective org (session membership + impersonation) across domain libs.

### D2 — Platform impersonation broken · Critical · REFACTOR

- **Evidence:** `apps/web/src/lib/platform/impersonation.ts`; `middleware.ts` ignores impersonation cookie; domain still DEFAULT; user RLS client has no target-org membership  
- **Gap:** Impersonation looks real in UI/session helpers but cannot operate on tenant data safely.  
- **Impact:** Platform ops / support unusable.  
- **Action:** Middleware + data path honor impersonation (admin client or membership-backed scope).

### D3 — Core HR + Payroll env-org · Critical · REFACTOR

- **Evidence:** Same DEFAULT pattern; `docs/payroll-commercial-release-checklist.md` multi-org **Not ready**  
- **Gap:** New registered tenants do not get a correct HR/payroll data path.  
- **Action:** Same as D1 for HR/payroll modules first (highest traffic).

### D4 — New-tenant bootstrap thin · High · REFACTOR

- **Evidence:** `provision-tenant.ts` creates org/branch/owner only; catalogs seeded by one-shot migration / `seed-org-catalogs` targeting DEFAULT  
- **Gap:** New SaaS orgs lack leave/claim/payroll catalogs.  
- **Action:** Seed catalogs inside `provisionTenant` (idempotent per org).

### D5 — Org switcher missing · High · MISSING

- **Evidence:** `docs/development-phases.md` Phase 10; no UI/API/active-org cookie  
- **Gap:** Multi-membership and Platform workflows need active org; session picks first membership when DEFAULT unset.  
- **Action:** Active-org session + switcher UI when multi-membership is a product requirement.

### D6 — Multi-tenant crons · High · REFACTOR

- **Evidence:** `payslip-email.ts`, `scan-document-compliance.ts` env-org scoped  
- **Gap:** Background jobs only serve the env org.  
- **Action:** Iterate orgs or use payload `organization_id` for all cron scanners.

### D7 — SaaS CI / e2e · High · REFACTOR

- **Evidence:** CI e2e-smoke `DEPLOYMENT_MODE=standalone`; no register→dashboard SaaS test  
- **Gap:** Regressions in SaaS path undetected.  
- **Action:** SaaS mode job: register provision + one portal query against membership org.

### D8 — Billing / signup→pay / marketing · FUTURE

- **Evidence:** No Stripe; Owner settings = packaging flags; `/` = app entry  
- **Gap:** Intentional until D1–D3 closed.  
- **Action:** Promote after multi-tenant GA green.

---

## Ranked SaaS work packages

| Rank | Package | Priority | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Effective org resolution across `apps/web` domain libs | Critical | L | **Done** |
| 2 | Fix Platform impersonation (middleware + data path) | Critical | M | **Done** |
| 3 | Seed org catalogs inside `provisionTenant` | High | M | **Done** |
| 4 | Multi-tenant crons (payslip, document compliance, …) | High | M | **Done** |
| 5 | Active-org session + org switcher | High | L | **Done** |
| 6 | SaaS CI path (register → portal smoke) | High | M | **Done** (unit provision+seed; e2e soak optional) |
| 7 | Platform post-provision tier/module ops | Medium | S–M | Open |
| 8 | SaaS ops runbook + features.md honesty | Medium | S | **Done** (`docs/saas-ops-notes.md`) |
| 9 | Health env matrix: DEFAULT optional in SaaS | Medium | S | **Done** (with #6) |
| 10 | Payment billing + signup→pay | FUTURE | L | FUTURE |
| 11 | Public marketing / SEO | FUTURE | L | FUTURE |
| 12 | Usage metering / seat limits | FUTURE | M | FUTURE |

---

## Already strong (SaaS foundations · KEEP)

- Schema `organization_id` + `current_user_org_ids()` RLS + dual-org CI probe  
- `/auth/register` + `provisionTenant` (org, branch, owner membership)  
- DB entitlements provider when org id is correct  
- Platform tenants list/provision UI (SaaS-gated)  
- R2 tenant key prefix `org/{id}/…`  
- Notification outbox global pending drain  

---

## Standalone vs SaaS (honest split)

| Concern | Standalone | SaaS today |
| --- | --- | --- |
| Sellable pilot | ~9/10 | Not GA |
| Payment | Offline invoice | FUTURE in-app |
| Org resolution | Env DEFAULT correct | Env DEFAULT **wrong** |
| Platform Admin | Health ops | Tenants UI OK; impersonation broken |

---

## Acceptance

Reply with:

- **A** — plan + implement Critical packages #1–2 only  
- **B** — plan + implement Critical + High (#1–6)  
- **C** — findings only (stop)  
- **D** — also draft FUTURE billing design (no code)
