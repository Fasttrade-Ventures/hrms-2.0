# SaaS Critical+High packages (#1–6) Implementation Plan

> **For agentic workers:** Execute inline task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make SaaS multi-tenant app-layer isolation work end-to-end for Critical+High packages (findings option B). No Stripe/marketing/metering (FUTURE).

**Architecture:** Canonical async `requireOrganizationId()` from session/impersonation/active-org cookie; middleware honors impersonation for path authz; provision seeds catalogs; crons iterate orgs; org switcher cookie + minimal UI; SaaS CI smoke.

**Tech Stack:** Next.js server, Supabase admin/user clients, Vitest/Playwright, GitHub Actions

## Global Constraints

- Do not implement FUTURE packages #10–12 (billing, marketing, metering)
- Standalone mode must keep working with `DEFAULT_ORGANIZATION_ID`
- In SaaS, `DEFAULT_ORGANIZATION_ID` must not collapse all tenants to one org
- Prefer `getEffectiveOrganizationId` / `requireOrganizationId` over new per-file env reads
- Keep middleware AUTH_TIMEOUT and health/cron bypass

---

### Task 1: Canonical org resolution (#1)

**Files:**
- Modify: `apps/web/src/lib/auth/organization-context.ts`
- Modify: `apps/web/src/lib/auth/session.ts` (SaaS: do not force DEFAULT membership)
- Modify: all `apps/web/src/lib/**` and actions that define local `getOrganizationId()` from env

**Produces:**
```ts
export async function getEffectiveOrganizationId(): Promise<string | null>
export async function requireOrganizationId(): Promise<string>
```

- [x] **Step 1:** Add `requireOrganizationId()` that throws if null
- [x] **Step 2:** Session: standalone uses DEFAULT; SaaS uses active-org cookie → membership match → first membership (ignore DEFAULT as forced filter)
- [x] **Step 3:** Replace local env `getOrganizationId` helpers with `await requireOrganizationId()`
- [x] **Step 4:** `pnpm --filter @hrms/web typecheck` + `pnpm test`

---

### Task 2: Impersonation middleware (#2)

**Files:**
- Modify: `apps/web/src/lib/supabase/middleware.ts`
- Modify: `apps/web/src/lib/platform/impersonation.ts` (if needed)

- [x] **Step 1:** Middleware reads `hrms_impersonate_org_id`; if platform_administrator + cookie, authorize portal paths as synthetic owner/HR roles
- [x] **Step 2:** Domain data already uses requireOrganizationId → impersonation org
- [x] **Step 3:** Verify startImpersonation → `/owner/dashboard` not redirected to unauthorized

---

### Task 3: Seed catalogs in provisionTenant (#3)

**Files:**
- Create: `apps/web/src/lib/platform/seed-org-catalogs.ts` (shared leave/claim/payroll seed)
- Modify: `apps/web/src/lib/platform/provision-tenant.ts`
- Optional: refactor `scripts/seed-org-catalogs.ts` to call shared logic or accept org id arg

- [x] **Step 1:** Extract seed function taking `(admin, organizationId)`
- [x] **Step 2:** Call after successful provision
- [x] **Step 3:** Unit/integration smoke that seed inserts don’t throw on duplicate

---

### Task 4: Multi-tenant crons (#4)

**Files:**
- Modify: `apps/web/src/lib/payroll/jobs/payslip-email.ts`
- Modify: `apps/web/src/lib/hr/scan-document-compliance.ts`
- Grep other cron scanners for DEFAULT_ORGANIZATION_ID

- [x] **Step 1:** List org ids from `organizations` (or distinct from payload)
- [x] **Step 2:** Loop each org with existing logic
- [x] **Step 3:** Standalone with one org still works

---

### Task 5: Active-org + switcher (#5)

**Files:**
- Modify: `organization-context.ts` / `session.ts` (ACTIVE_ORG_COOKIE)
- Create: `apps/web/src/app/(owner)/owner/actions.ts` or shared `switch-organization` action
- Modify: portal layout / owner or HR topbar for switcher when `memberships.length > 1` or platform

- [x] **Step 1:** Cookie `hrms_active_org_id` validated against user memberships
- [x] **Step 2:** Server action `switchOrganization(orgId)`
- [x] **Step 3:** Minimal UI select when user has 2+ memberships

---

### Task 6: SaaS CI path (#6)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `tests/integration/saas-provision.test.ts` or e2e saas smoke

- [x] **Step 1:** Integration test: provisionTenant seeds catalogs (with mocked/admin supabase if needed) OR payroll-integration-style supabase start + provision
- [x] **Step 2:** CI job or extend payroll-integration with `DEPLOYMENT_MODE=saas` provision assertion
- [x] **Step 3:** Health: `DEFAULT_ORGANIZATION_ID` required only when standalone

---

### Task 7: Docs + findings status

- [x] Update SaaS findings packages 1–6 Done
- [x] Add short `docs/saas-ops-notes.md` (honesty: isolation path, no billing yet)
- [x] Fix `docs/features.md` if it oversells multi-tenant GA

---

## Out of scope

- Packages 7–9 Medium optional polish beyond health DEFAULT fix in Task 6
- Packages 10–12 FUTURE
