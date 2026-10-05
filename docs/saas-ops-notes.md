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

## Billing (Stripe)

- Opt-in: `BILLING_ENABLED=true` with `DEPLOYMENT_MODE=saas`.
- Migration: `20260828120000_saas_billing.sql` plus `20261006150000_saas_stripe_prices.sql` (revised plan amounts, Stripe checkout sessions).
- Register starts a 14-day trial with Professional features, then sign-in. No payment is required to create the organization.
- After the trial, or when a paid period ends unpaid, status becomes `past_due`. New writes stop. People can still sign in and read. They have `BILLING_PAST_DUE_GRACE_DAYS` (default 7) to pay on `/owner/billing` via Stripe. After that the subscription is canceled.
- Owner: `/owner/billing` — pay via Stripe Checkout, invoice history.
- Webhook: `POST /api/webhooks/stripe` (`STRIPE_WEBHOOK_SECRET`). `POST /api/webhooks/billplz` remains for bills already issued.
- Cron: `GET /api/cron/billing-renewal` (Bearer `CRON_SECRET`).
- Prices: `docs/pricing.md`.

## Still FUTURE

- Public marketing / pricing page
- Usage metering

## Known billing ops gaps (re-audit 2026-08-28) — remediated

- ~~`requireActiveSubscription` unused~~ → `requireOrganizationIdForWrite()` on payroll generate/workflow, create employee, leave apply, apply-behalf creates.
- ~~`billing-renewal` missing from vercel.json~~ → scheduled `0 1 * * *` UTC.
- ~~`/api/register` without subscription~~ → creates trial subscription when `BILLING_ENABLED`.
- ~~Health ignores Billplz~~ → requires Stripe env keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) when `BILLING_ENABLED=true`.

## Performance

- Billing checks run only on write paths and only when `BILLING_ENABLED=true`.
- Status query is cached per request (`react` `cache`) and selects three columns only.
- JWT active-org claim remains deferred (cookie + RLS).

## Verify locally

```bash
DEPLOYMENT_MODE=saas pnpm exec vitest run tests/unit/saas-provision-catalogs.test.ts tests/unit/seed-org-catalogs.test.ts tests/unit/membership-selection.test.ts tests/unit/billing-calculate-invoice.test.ts tests/unit/billplz-signature.test.ts tests/unit/subscription-gate.test.ts
pnpm --filter @hrms/web typecheck
pnpm test
```
