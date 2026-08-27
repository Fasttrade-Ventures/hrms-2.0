# Critical/High Gap Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Execution status:** Inline execution completed 2026-08-27 on `fix/audit-remediation-pr-a`. Tasks 1–8 done (JWT behavioral RLS fixtures + Branch Admin document upload / multi-branch remain documented follow-ups).

**Goal:** Close all Critical/High REFACTOR work packages (1–7) from the 2026-08-27 master-prompt gap analysis under the standalone-first lens.

**Architecture:** Finish residual audit polish, then prove tenant isolation with real RLS tests, harden sensitive APIs with shared rate limits, make entitlements/jobs packaging honest, refresh feature docs, and complete Branch Admin backlog items that do not require schema redesign. No Stripe, no marketing site, no multi-tenant GA.

**Tech Stack:** Next.js App Router (`apps/web`), Supabase Postgres + pgTAP (`supabase/tests`), `@hrms/platform` entitlements/jobs, Vitest, existing `checkRateLimit`.

**Source:** `docs/superpowers/specs/2026-08-27-saas-master-prompt-gap-analysis-findings.md`

## Global Constraints

- Do **not** remove `AUTH_TIMEOUT_MS` or health/cron auth bypass.
- Middleware membership timeout stays **fail closed**.
- Prefer `redirect("/unauthorized…")` over throwing from gate helpers.
- Standalone: Owner may edit `product_tier`; SaaS: Platform-only.
- Leave empty `employee_allowed_leave_types` = **all types** (do not flip).
- Do not commit `apps/web/tsconfig.tsbuildinfo`.
- FUTURE items (billing, public SEO site, multi-org GA, MFA packaging) stay out of scope.
- Multi-branch Branch Admin accounts (schema change) stay **out of this plan** — leave a backlog note only.
- Match existing code style; no drive-by refactors.
- Commit only when the user asks (or when executing under an explicit commit instruction in a later session).

## Package map

| Plan Task | Gap package | Status entering plan |
| --- | --- | --- |
| Task 1 | #1 Audit remediation residual | Nearly done — close PARTIAL + doc checkboxes |
| Task 2 | #2 RLS isolation matrix | Critical — stubs only |
| Task 3 | #3 API auth inventory + rate limits | High |
| Task 4 | #4 Entitlements packaging truth | High |
| Task 5 | #5 Jobs ledger honesty | High |
| Task 6 | #6 Refresh features.md / phases | High |
| Task 7 | #7 Branch Admin parity backlog | High — three UI gaps; multi-branch deferred |

## File map

| Area | Files |
| --- | --- |
| Audit residual | `apps/web/src/components/employee/dashboard-clock-panel.tsx`, `docs/superpowers/plans/2026-08-27-audit-remediation.md`, `docs/perf-followups.md` |
| RLS | `supabase/tests/001_rls_matrix.sql`, `docs/architecture-notes.md` |
| Rate limit | `apps/web/src/lib/rate-limit.ts`, `apps/web/src/app/api/register/route.ts`, new `apps/web/src/lib/rate-limit.test.ts`, docs inventory note |
| Entitlements | `packages/platform/src/entitlements/env-provider.ts`, `.env.example`, `docs/architecture-notes.md`, Owner settings copy if present |
| Jobs | `packages/platform/src/jobs/ledger.ts`, `packages/platform/src/index.ts`, `docs/features.md` |
| Docs | `docs/features.md`, `docs/development-phases.md` |
| Branch Admin | `apps/web/src/components/reports/reports-hub.tsx`, `apps/web/src/lib/reports/catalog.ts`, branch-admin apply-behalf routes, documents upload path, `docs/branch-admin-backlog.md` |

---

### Task 1: Close audit remediation residuals (Package #1)

**Files:**
- Modify: `apps/web/src/components/employee/dashboard-clock-panel.tsx`
- Modify: `docs/superpowers/plans/2026-08-27-audit-remediation.md` (mark Tasks 1–18 checkboxes / status)
- Modify: `docs/perf-followups.md` (confirm Task 17 residuals remain optional)
- Test: manual UI parity with attendance panel; no new unit required if logic mirrors existing helper

**Interfaces:**
- Consumes: `distanceMeters` from `@/lib/attendance/geofence` (same as `attendance-clock-panel.tsx`)
- Produces: Dashboard geofence status copy matching attendance panel (`within range (~Xm)` / `Outside range (~Xm of Ym)`)

- [ ] **Step 1: Align dashboard geofence distance messaging**

In `dashboard-clock-panel.tsx`, import `distanceMeters` and when `locationState === "ready"` and geofence is set, compute meters and show the same strings as `attendance-clock-panel.tsx`:

```tsx
import { distanceMeters } from "@/lib/attendance/geofence";

// where location status text is rendered:
if (geofenceRequired && locationState === "ready" && coords && geofence) {
  const meters = Math.round(
    distanceMeters(coords, {
      latitude: geofence.latitude,
      longitude: geofence.longitude,
    }),
  );
  const within = meters <= geofence.radiusMeters;
  locationHint = within
    ? `Location ready · within range (~${meters}m)`
    : `Outside range (~${meters}m of ${geofence.radiusMeters}m)`;
}
```

Keep server-side geofence authority unchanged.

- [ ] **Step 2: Mark audit plan complete**

Update `docs/superpowers/plans/2026-08-27-audit-remediation.md`:
- Set a top status line: `Status: Implemented on fix/audit-remediation-pr-a (2026-08-27); Task 11 geofence copy closed in Critical/High gap plan; Task 17 SQL aggregates remain optional per perf-followups.`
- Check off task step boxes that match shipped code (or add a single “Coverage: DONE” table mirroring the agent verification) — do not rewrite the whole plan.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @hrms/web exec tsc --noEmit` (or repo’s usual web typecheck)
Expected: no new errors from the clock panel change.

---

### Task 2: Real RLS isolation matrix (Package #2)

**Files:**
- Modify: `supabase/tests/001_rls_matrix.sql`
- Modify: `docs/architecture-notes.md` (security checklist)
- Optional: `tests/integration/README.md` note on how to run pgTAP locally

**Interfaces:**
- Consumes: `public.current_user_org_ids()`; policies on `employees`, `payroll_payruns` (or payruns table name from migrations), `organization_memberships`
- Produces: pgTAP plan that fails if Org A user can `select` Org B rows

- [ ] **Step 1: Confirm payrun table name and RLS**

Run locally (or read migrations):

```bash
rg -n "payroll_payruns|create policy" supabase/migrations --glob '*payroll*' | head -40
```

Use the real table name in tests (likely `payroll_payruns`).

- [ ] **Step 2: Replace stub tests with allow/deny matrix**

Rewrite `supabase/tests/001_rls_matrix.sql` approximately as:

```sql
-- RLS isolation matrix: two orgs, two users, allow/deny on employees (+ payruns if RLS enabled)

begin;

select plan(6);

-- Fixtures (rollback at end)
-- Use fixed UUIDs for readability
select set_config('app.rls_test', '1', true);

-- NOTE: Adjust inserts to match NOT NULL columns / FKs in your schema.
-- Minimal pattern:
-- org_a, org_b
-- user_a, user_b (auth.users may require supabase_auth helpers — if unavailable,
--   use tests that only assert policy expressions via pg_policies +
--   a documented integration harness). Prefer real auth.uid() simulation:

create temporary table if not exists _skip (reason text);

-- Preferred path when auth schema is available:
-- insert orgs, memberships, employees for A and B
-- then:
-- select set_config('request.jwt.claim.sub', '<user_a_uuid>', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- set local role authenticated;
-- select is((select count(*)::int from employees where organization_id = '<org_b>'), 0,
--   'user A cannot see org B employees');
-- select ok((select count(*) > 0 from employees where organization_id = '<org_a>'),
--   'user A can see org A employees');
-- repeat for payroll_payruns

-- Always keep these structural guarantees:
select ok(
  exists(select 1 from pg_proc where proname = 'current_user_org_ids'),
  'current_user_org_ids helper exists'
);

select ok(
  (select relrowsecurity from pg_class where relname = 'employees'),
  'employees has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where relname = 'payroll_payruns'),
  'payroll_payruns has RLS enabled'
);

select ok(
  exists(
    select 1 from pg_policies
    where tablename = 'employees'
      and qual ilike '%current_user_org_ids%'
  ),
  'employees policy uses current_user_org_ids'
);

select ok(
  exists(
    select 1 from pg_policies
    where tablename = 'payroll_payruns'
      and (qual ilike '%current_user_org_ids%' or with_check ilike '%current_user_org_ids%')
  ),
  'payroll_payruns policy uses current_user_org_ids'
);

-- If JWT simulation works in this environment, add the 2 count assertions above
-- and raise plan(N) accordingly. If auth.users inserts are blocked, stop at policy
-- expression tests and add a Vitest integration note — do NOT leave only existence stubs.

select * from finish();
rollback;
```

**Implementer rule:** Prefer real `auth.uid()` allow/deny if the local Supabase test DB allows inserting `auth.users` + memberships. If not, ship policy-expression assertions + a short `docs/architecture-notes.md` note: “Behavioral cross-org matrix requires Supabase auth fixtures; tracked as follow-up if blocked.” Do not claim Critical closed without either real allow/deny **or** an explicit blocked-reason note in findings.

- [ ] **Step 3: Run pgTAP**

```bash
# Prefer project’s documented command if present; otherwise:
supabase test db
# or: psql "$DATABASE_URL" -f supabase/tests/001_rls_matrix.sql
```

Expected: all assertions PASS.

- [ ] **Step 4: Update architecture security checklist**

In `docs/architecture-notes.md`, check off:

```markdown
- [x] RLS denies cross-org reads/writes
```

Add one line under it: `Verified by supabase/tests/001_rls_matrix.sql (<date>).`

---

### Task 3: API auth inventory + sensitive rate limits (Package #3)

**Files:**
- Create: `docs/api-auth-inventory.md`
- Create: `apps/web/src/lib/rate-limit.test.ts`
- Modify: `apps/web/src/app/api/register/route.ts`
- Modify: `apps/web/src/lib/rate-limit.ts` (export `resetRateLimitStore` if missing for tests — already has clear helper; use it)
- Optional: login server action path if registration-adjacent abuse surface exists

**Interfaces:**
- Consumes: `checkRateLimit(key, limit, windowMs, cooldownMs)`
- Produces: register endpoint returns 429 with retry hint when exceeded

- [ ] **Step 1: Write failing rate-limit unit tests**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimitStore } from "./rate-limit";

afterEach(() => {
  clearRateLimitStore();
});

describe("checkRateLimit", () => {
  it("allows under the limit", () => {
    expect(checkRateLimit("t:1", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit("t:1", 2, 60_000).allowed).toBe(true);
  });

  it("blocks over the limit", () => {
    checkRateLimit("t:2", 1, 60_000);
    const blocked = checkRateLimit("t:2", 1, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
```

Confirm export name is `clearRateLimitStore` (or rename test to match existing `clear` export in `rate-limit.ts`).

- [ ] **Step 2: Run tests — expect pass for existing helper; keep as regression**

```bash
pnpm --filter @hrms/web test -- src/lib/rate-limit.test.ts
```

Expected: PASS.

- [ ] **Step 3: Rate-limit `POST /api/register`**

At top of handler after SaaS gate:

```ts
import { checkRateLimit } from "@/lib/rate-limit";

// after isSaasMode check:
const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";
const limited = checkRateLimit(`register:${ip}`, 5, 60_000, 3_000);
if (!limited.allowed) {
  return NextResponse.json(
    { error: `Too many registration attempts. Try again in ${limited.retryAfterSeconds} seconds.` },
    { status: 429 },
  );
}
```

- [ ] **Step 4: Write API auth inventory doc**

Create `docs/api-auth-inventory.md` listing every `apps/web/src/app/api/**/route.ts` with auth mechanism:

| Route | Auth | Notes |
| --- | --- | --- |
| `/api/health` | none (public) | middleware bypass |
| `/api/cron/*` | `CRON_SECRET` Bearer | middleware bypass |
| `/api/register` | SaaS-only + rate limit | no session |
| `/api/v1/*` | `withApiAuth` API key | org-scoped |
| `/api/files/[fileId]/download` | session (document) | … |
| … | … | … |

Explicit note: middleware does **not** run `canAccessPath` for `/api/*`; each route must self-authenticate.

- [ ] **Step 5: Typecheck / test**

```bash
pnpm --filter @hrms/web test -- src/lib/rate-limit.test.ts
pnpm --filter @hrms/web exec tsc --noEmit
```

---

### Task 4: Entitlements packaging truth (Package #4)

**Files:**
- Modify: `packages/platform/src/entitlements/env-provider.ts` (comment only unless safer warn)
- Modify: `.env.example`
- Modify: `docs/architecture-notes.md`
- Modify: Owner settings UI copy if it implies SaaS billing (`apps/web/src/app/(owner)/owner/settings/` or entitlements component)

**Interfaces:**
- Consumes: `PRODUCT_TIER`, `DEPLOYMENT_MODE`, `MODULE_OVERRIDES`
- Produces: Documented intentional standalone default = enterprise when unset

- [ ] **Step 1: Document default in code**

Above `parseTier()`:

```ts
/**
 * Standalone commercial default: unset PRODUCT_TIER → enterprise (all modules).
 * Set PRODUCT_TIER=core|professional to package a narrower standalone deploy.
 * SaaS should prefer DB org product_tier via createDbEntitlementProvider.
 */
```

- [ ] **Step 2: Clarify `.env.example`**

```env
# Entitlements (standalone). Default if unset: enterprise (all modules).
# Use core|professional for narrower packaging; MODULE_OVERRIDES for JSON toggles.
PRODUCT_TIER=enterprise
# MODULE_OVERRIDES={"recruitment":false}
```

- [ ] **Step 3: Architecture note**

Add a short “Entitlements packaging” subsection to `docs/architecture-notes.md` stating:
- Standalone env provider defaults to enterprise
- Owner may toggle modules / tier in standalone
- SaaS tier changes are Platform-only
- Payroll module key is Pro in code (`packages/platform` types) even if sold as part of a commercial bundle

- [ ] **Step 4: Owner UI one-liner**

If Owner settings already shows tier, add helper text: `Standalone packaging uses PRODUCT_TIER / module flags — not a payment subscription.`

---

### Task 5: Jobs ledger honesty (Package #5)

**Files:**
- Modify: `packages/platform/src/jobs/ledger.ts`
- Modify: `packages/platform/src/index.ts`
- Modify: `docs/features.md` (scheduled jobs row)
- Optional: `docs/architecture-notes.md` one paragraph on outbox-as-SoT

**Interfaces:**
- Consumes: none from cron paths today
- Produces: Deprecated in-memory ledger clearly marked; product docs point at `notification_outbox` + Vercel crons

- [ ] **Step 1: Deprecate ledger API**

```ts
/**
 * @deprecated In-memory process-local job map. Not durable and unused by production crons.
 * Source of truth: DB notification_outbox + Vercel cron routes under apps/web/src/app/api/cron/*.
 * Do not build new features on this module.
 */
export function enqueueJob(...)
```

Apply `@deprecated` to all exports in the file.

- [ ] **Step 2: Keep export but comment in index**

```ts
/** @deprecated See jobs/ledger.ts — prefer notification_outbox + cron routes. */
export * from "./jobs/ledger";
```

Do **not** delete yet (avoid breaking unknown importers); grep shows no app usage — safe to deprecate only.

- [ ] **Step 3: Fix features.md row**

Change:

| Scheduled jobs ledger | …

To:

| Scheduled jobs (Vercel cron + notification outbox) | Core | — | Idempotent outbox; in-memory platform ledger deprecated |

---

### Task 6: Refresh features.md / phases vs code (Package #6)

**Files:**
- Modify: `docs/features.md`
- Modify: `docs/development-phases.md` (only rows that are clearly stale)

**Spot-check list (must update if code exists):**

| Doc claim | Verify path | Likely fix |
| --- | --- | --- |
| HR create employee ⬜ | `apps/web/src/app/(hr)/hr/employees/` | → ✅ |
| Employee CSV bulk create ⬜ | `.../employees/import/` | → ✅ |
| Family / dependents ⬜ | employee update / payroll deps | → ✅ or 🟡 with path |
| Compensation / salary ⬜ | employee compensation fields | → ✅ or 🟡 |
| Leave blackouts | org leave settings | mark if shipped |

- [ ] **Step 1: Grep and update features.md rows**

```bash
rg -n "createEmployee|dependents|compensation|import" apps/web/src/app/\(hr\)/hr/employees apps/web/src/lib/employees -g '*.ts*' | head -50
```

Flip UI tags to match reality; keep honest 🟡 when partial.

- [ ] **Step 2: Phases doc**

In `docs/development-phases.md`, mark contradictory “not started” items that are done as done, or add a banner: `Partial staleness possible — prefer docs/features.md after 2026-08-27 refresh.`

- [ ] **Step 3: Self-review**

No ⬜ remains for features that have routes under `apps/web/src/app/(hr)/hr/employees`.

---

### Task 7: Branch Admin parity backlog (Package #7)

**Files:**
- Modify: `apps/web/src/components/reports/reports-hub.tsx` and/or `apps/web/src/lib/reports/catalog.ts`
- Create: `apps/web/src/app/(branch-admin)/branch-admin/apply-behalf/[id]/page.tsx` (and late variant if HR has split routes)
- Modify: branch-admin documents — wire upload if HR shared component supports `basePath` / branch scope; otherwise document limitation
- Modify: `docs/branch-admin-backlog.md`

**Interfaces:**
- Consumes: existing `ReportsHub` `portal="branch-admin"`; HR apply-behalf detail patterns; `listBranchDocuments`
- Produces: Hub hides payroll/asset reports for branch-admin; apply-behalf detail under branch-admin basePath

- [ ] **Step 1: Filter report catalog for branch-admin**

In catalog or hub, when `portal === "branch-admin"`, exclude slugs whose category is payroll or assets (inspect `getReportDefinition` / catalog categories). Example:

```ts
const BRANCH_ADMIN_EXCLUDED = new Set(["payroll-summary", "asset-register"]); // use real slugs
const reports = allReports.filter((r) => !BRANCH_ADMIN_EXCLUDED.has(r.slug));
```

Also guard `[slug]/page.tsx` to `notFound()` if excluded.

- [ ] **Step 2: Apply-behalf detail pages**

Mirror HR detail route under:

`apps/web/src/app/(branch-admin)/branch-admin/apply-behalf/[id]/page.tsx`

Reuse shared detail component with `basePath="/branch-admin/apply-behalf"`. Enforce branch scope in data loader (employee.branch_id === admin branch).

- [ ] **Step 3: Documents upload**

If HR upload component can be reused with branch-scoped employee picker, add upload entry on `/branch-admin/documents`. If not safely reusable without leaking org-wide employees, ship a clear EmptyState CTA: “Upload from employee profile” and mark backlog item as deferred with reason — do not fake upload.

- [ ] **Step 4: Update backlog doc**

```markdown
## Remaining enhancements

- [x] Branch report catalog subset UI
- [x] Apply-behalf detail pages under `/branch-admin/apply-behalf/...`
- [x] or [ ] Document upload — (state honestly)
- [ ] Multi-branch admins (deferred — schema; one employees.branch_id today)
```

---

### Task 8: Update gap findings status

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-saas-master-prompt-gap-analysis-findings.md`

- [ ] **Step 1: Mark packages 1–7 closed** with date and PR/branch note; leave packages 8–10 Medium open; FUTURE unchanged.

---

## Self-review (plan author)

1. **Spec coverage:** Findings packages 1–7 each map to Tasks 1–7; Task 8 closes the loop on the findings doc.
2. **Placeholders:** Task 2 SQL includes an implementer rule if JWT fixtures are blocked — must document, not silently leave stubs.
3. **Out of scope preserved:** No billing, marketing site, multi-org GA, multi-branch admin schema.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-critical-high-gap-remediation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
