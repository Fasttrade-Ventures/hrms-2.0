# SaaS-lens master-prompt gap analysis — findings

**Date:** 2026-08-27 (updated)  
**Status:** Dual-mode remediation complete for non-FUTURE clusters — see [dual-mode plan](../plans/2026-08-27-dual-mode-saas-standalone-plan.md)  
**Design:** [2026-08-27-saas-lens-gap-analysis-design.md](./2026-08-27-saas-lens-gap-analysis-design.md)  
**Lens:** SaaS-first (option C · hybrid depth)  
**Complements:** Standalone findings (~9/10 KEEP)

**Verdict:** Standalone ~**9/10** pilot-ready. SaaS multi-tenant isolation ~**7–8/10** for app-layer GA (no billing/marketing). Both modes share one codebase via `DEPLOYMENT_MODE`.

---

## Scorecard (18 clusters · updated)

| # | Cluster | Class | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Product identity & modes | REFACTOR | **Done** | Mode gates UI; domain uses session org |
| 2 | Identity & authentication | REFACTOR | **Done** | Register → sign-in + active org; shared membership picker |
| 3 | Tenancy & organization | REFACTOR | **Done** | `requireOrganizationId()` across domain libs |
| 4 | Roles & permissions | KEEP | **Done** | Active-org cookie drives role set + switcher |
| 5 | Core HR domain | REFACTOR | **Done** | Session org, not env DEFAULT |
| 6 | Payroll (Malaysia) | REFACTOR | **Done** | Same; checklist updated |
| 7 | Entitlements & gating | KEEP | **Done** | DB tier; Platform can change tenant tier |
| 8 | Billing & payments | FUTURE | **Spec ready** | [Billplz SaaS billing design](./2026-08-27-billplz-saas-billing-design.md) — SaaS only |
| 9 | Notifications & email | REFACTOR | **Done** | Multi-org crons |
| 10 | Files & media | REFACTOR | **Done** | Callers pass session org to R2 writers |
| 11 | Reporting / search / import | REFACTOR | **Done** | Runners use session org; global search defer |
| 12 | Audit & platform admin | REFACTOR | **Done** | Impersonation honored in middleware + data |
| 13 | UX systems | REFACTOR | **Done** | Org switcher; register flow |
| 14 | Security & API hardening | KEEP | **Defer** | RLS + cookie OK; JWT active-org claim optional |
| 15 | Jobs / cron / observability | REFACTOR | **Done** | Health: DEFAULT optional in SaaS |
| 16 | Testing & CI | REFACTOR | **Partial** | Unit SaaS + membership tests; e2e soak optional |
| 17 | Docs & ops readiness | REFACTOR | **Done** | `docs/saas-ops-notes.md` + dual-mode plan |
| 18 | Public site / SEO / GEO | FUTURE | **Skip** | Login-only entry — intentional |

**Summary:** 10 Done · 2 KEEP/Defer · 2 FUTURE · 1 Partial (e2e soak)

---

## Standalone vs SaaS (current)

| Concern | Standalone | SaaS |
| --- | --- | --- |
| Sellable pilot | ~9/10 | ~7–8/10 app isolation |
| Payment | Offline invoice | FUTURE in-app |
| Org resolution | `DEFAULT_ORGANIZATION_ID` | Session + active-org cookie |
| Register | Disabled | Provision + sign-in |
| Platform Admin | Health ops | Tenants + tier + impersonation |
| Owner tier change | Owner settings | Platform admin only |

---

## Ranked work packages (final)

| Rank | Package | Status |
| --- | --- | --- |
| 1–6 | Critical+High isolation | **Done** |
| 7 | Platform post-provision tier ops | **Done** |
| 8–9 | Ops runbook + health | **Done** |
| 10–12 | Billing / marketing / metering | Billing **spec ready** (Billplz); marketing/metering FUTURE |
| — | Phase 3: SaaS e2e soak, JWT claim, module-flag ops | Optional later |

---

## Plans

- Phase 1 (Critical+High): [2026-08-27-saas-critical-high-remediation.md](../plans/2026-08-27-saas-critical-high-remediation.md) ✅  
- Phase 2 (Dual-mode polish): [2026-08-27-dual-mode-saas-standalone-plan.md](../plans/2026-08-27-dual-mode-saas-standalone-plan.md) ✅  
- Ops: [docs/saas-ops-notes.md](../../saas-ops-notes.md)
