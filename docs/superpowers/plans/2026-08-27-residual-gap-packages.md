# Residual gap packages 1–6 Implementation Plan

> **For agentic workers:** Execute inline in this session. Steps use checkbox syntax for tracking.

**Goal:** Close re-audit residual packages #1–6 (no FUTURE SaaS, no Pro L automation).

**Architecture:** Strengthen RLS CI with an in-test dual-org seed that must fail on leak; document portal/specialist honesty; expand smoke e2e; move rate limits to Postgres-backed RPC with memory fallback for tests; mark architecture security checklist against existing code evidence.

**Tech Stack:** Supabase pgTAP, Next.js, Vitest, Playwright, Postgres RPC

**Global Constraints:**
- Do not implement Stripe/marketing/multi-org GA/MFA (FUTURE)
- Do not build Pro leave/attendance automation (deferred L)
- Keep middleware health/cron bypass and AUTH_TIMEOUT behavior
- Prefer honesty (document defer) over fake specialist wiring

---

### Task 1: RLS CI-gate + dual-org seed

**Files:** `supabase/tests/001_rls_matrix.sql`, `.github/workflows/ci.yml`

- [x] Seed two orgs + auth users + memberships + employees inside the test transaction
- [x] Fail (not skip) if behavioral deny does not hold
- [x] Add `rls-matrix` CI job: supabase start → `supabase test db`

### Task 2: Portal docs refresh

**Files:** `docs/features.md`, `docs/developer-brief.md`

- [x] Mark Branch Admin / Owner UI ✅/🟡 with real routes
- [x] Remove “design pending” for shipped portals

### Task 3: Specialist permissions honesty

**Files:** `packages/domain/src/roles.ts`, `docs/architecture-notes.md`, `docs/features.md` (duty segregation note)

- [x] Annotate wired vs deferred specialists; do not fake-wire recruiter/etc.

### Task 4: Playwright smoke expand

**Files:** `tests/e2e/smoke.spec.ts`

- [x] Add unauthenticated `/employee/dashboard` → login redirect (CI-safe, no demo seed)

### Task 5: Durable rate limits

**Files:** migration `rate_limit_buckets`, `apps/web/src/lib/rate-limit.ts`, callers, unit tests, `docs/api-auth-inventory.md`

- [x] Postgres RPC + async check; memory fallback when no admin client / in unit tests

### Task 6: Architecture security checklist

**Files:** `docs/architecture-notes.md`

- [x] Check off manager scope, HR create audit, R2 private, cron Bearer, payroll lock with evidence paths

### Task 7: Update findings status

**Files:** findings md

- [x] Mark residuals 1–6 Done; leave 7–8 + FUTURE open
