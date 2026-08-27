# Dual-mode plan — Standalone + SaaS

**Goal:** One codebase, two deploy modes. Standalone stays ~9/10 pilot-ready. SaaS reaches safe multi-tenant GA without billing/marketing (FUTURE).

**Mode switch:** `DEPLOYMENT_MODE=standalone|saas` + env matrix below.

| Env | Standalone | SaaS |
| --- | --- | --- |
| `DEPLOYMENT_MODE` | `standalone` (default) | `saas` |
| `DEFAULT_ORGANIZATION_ID` | **Required** (single tenant) | **Omit** (never collapse tenants) |
| Register `/auth/register` | Hidden | Enabled |
| Platform tenants UI | Hidden | Enabled |
| Org resolution | `DEFAULT_ORGANIZATION_ID` | Session membership + `hrms_active_org_id` cookie + impersonation |
| Crons | Single org (DEFAULT) | Iterate all orgs |
| Health | DEFAULT required | DEFAULT optional |
| Owner tier change | Owner settings | Platform admin only |

---

## Phase 1 — Critical+High isolation ✅ Done

See [2026-08-27-saas-critical-high-remediation.md](./2026-08-27-saas-critical-high-remediation.md).

| # | Cluster | Fix |
| --- | --- | --- |
| 3 | Tenancy | `requireOrganizationId()` across domain libs |
| 5 | Core HR | Same |
| 6 | Payroll | Same |
| 12 | Impersonation | Middleware + session synthetic roles |
| 9 | Crons | Multi-org loops |
| 13 | UX | Org switcher + active-org cookie |
| 15 | Health | DEFAULT optional in SaaS |
| 16 | CI | `saas-unit` job |

---

## Phase 2 — Dual-mode polish (this sprint)

| # | Cluster | Task | Mode |
| --- | --- | --- | --- |
| 2 | Identity | Post-register sign-in + set active org cookie | SaaS |
| 2 | Identity | Shared membership picker (no fragile `maybeSingle`) | Both |
| 4 | Roles | Login/activate use active-org membership for dashboard | Both |
| 7 | Entitlements | Platform admin can change tenant tier post-provision | SaaS |
| 1 | Product identity | Update scorecard + payroll checklist honesty | Docs |
| 16 | Testing | Membership selection unit tests | Both |

- [x] All Phase 2 tasks above

**Out of scope (FUTURE):** #8 billing, #18 marketing, usage metering, Stripe, public pricing page, global search (#11 defer).

**Defer (acceptable):** #14 active-org JWT claim — cookie + RLS membership is sufficient for GA; JWT claim is hardening polish.

---

## Phase 3 — Optional hardening (later)

- SaaS e2e: register → owner dashboard smoke (Playwright + local Supabase)
- Platform module-flag ops per tenant
- Tenant-aware empty states in portal
- Active-org claim in JWT for API v1 hardening

---

## Verification matrix

```bash
# Both modes
pnpm --filter @hrms/web typecheck
pnpm test

# SaaS-specific
DEPLOYMENT_MODE=saas pnpm exec vitest run tests/unit/saas-provision-catalogs.test.ts tests/unit/seed-org-catalogs.test.ts tests/unit/membership-selection.test.ts

# Standalone smoke (existing)
DEPLOYMENT_MODE=standalone DEFAULT_ORGANIZATION_ID=<uuid> pnpm dev
```

**Standalone acceptance:** Single org, DEFAULT env, no register, owner can change tier, all portals work.

**SaaS acceptance:** No DEFAULT required, register provisions + signs in, switcher for 2+ memberships, impersonation works, crons hit all orgs, platform can set tier.
