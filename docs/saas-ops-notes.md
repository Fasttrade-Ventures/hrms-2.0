# SaaS ops notes (honest)

**Status:** Isolation path for Critical+High packages (#1–6) is implemented. This is **not** full commercial SaaS GA (no Stripe, marketing site, or seat metering).

## Deploy modes

| Mode | `DEPLOYMENT_MODE` | `DEFAULT_ORGANIZATION_ID` |
| --- | --- | --- |
| Standalone | `standalone` (default) | **Required** — single tenant |
| SaaS | `saas` | Optional / omit — do not force all tenants onto one org |

Health checks treat `DEFAULT_ORGANIZATION_ID` as required only when standalone.

## Tenant bootstrap

- `/auth/register` and Platform **Provision tenant** call `provisionTenant`.
- After org + branch + owner membership, `seedOrgCatalogs` seeds leave types, claim types, and payroll components (idempotent).
- CLI: `pnpm seed-org-catalogs` (uses `DEFAULT_ORGANIZATION_ID` or `ORGANIZATION_ID`).

## Active organization

- Cookie: `hrms_active_org_id` (validated against memberships).
- Portal topbar shows an org switcher when the user has 2+ memberships in SaaS mode.
- Register (SaaS): provisions tenant, signs in, sets active org, redirects to owner dashboard.
- Platform impersonation: `hrms_impersonate_org_id` honored by middleware (synthetic owner/HR roles) and by `requireOrganizationId()`.

## Platform ops

- Platform admin can change tenant product tier on `/platform/tenants`.

## Background jobs

- Payslip email and document-compliance crons iterate **all** organizations in SaaS (standalone still uses DEFAULT only).

## Still FUTURE

- Billplz subscription billing — **design spec:** `docs/superpowers/specs/2026-08-27-billplz-saas-billing-design.md`
- Public marketing / pricing page
- Usage metering / hard seat limits

## Verify locally

```bash
DEPLOYMENT_MODE=saas pnpm exec vitest run tests/unit/saas-provision-catalogs.test.ts tests/unit/seed-org-catalogs.test.ts
pnpm --filter @hrms/web typecheck
pnpm test
```
