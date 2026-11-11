# Analytics cockpit + Developer API partner tabs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin Analytics page with a filtered Recharts HR cockpit (workforce, leave, payroll, recruitment) plus click-to-drawer detail; regroup BukuCloud / Virtual Hirix under Developer API tabs.

**Architecture:** Extend `apps/web/src/lib/analytics/queries.ts` with period/branch/department-aware aggregates and detail row loaders. Client dashboard uses Recharts + URL search params + a Sheet drawer. Integrations: tabbed `/hr/integrations/api` embeds BukuCloud settings and a Virtual Hirix partner panel; redirect old BukuCloud URL; slim sidebar.

**Tech Stack:** Next.js App Router, Recharts, existing portal UI (`PortalSectionCard`, `StatCard`), shadcn Sheet/Tabs (add if missing), Supabase server client, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-11-analytics-cockpit-design.md`](../specs/2026-11-11-analytics-cockpit-design.md)

## Global Constraints

- Do not push or merge unless the user explicitly asks.
- No analytics warehouse / materialized snapshots in v1.
- No dedicated analytics detail routes — drawer only.
- No invented Virtual Hirix sync backend — partner guidance tab only.
- Recruitment widgets only when recruitment module/data path is available (same pattern as today).
- Preserve HR / director / owner shared `AnalyticsDashboard`.
- Prefer URL search params for filters (`period`, `branchId`, `departmentId`) and API tabs (`tab`).

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/package.json` | Add `recharts` dependency |
| `apps/web/src/lib/analytics/period.ts` | Pure period range helpers + filter parse |
| `apps/web/src/lib/analytics/queries.ts` | Extended aggregates + detail queries |
| `apps/web/src/components/ui/sheet.tsx` (if needed) | Drawer primitive |
| `apps/web/src/components/ui/tabs.tsx` (if needed) | Tabs primitive |
| `apps/web/src/components/analytics/*` | Filters, charts, drawer, dashboard shell |
| `apps/web/src/app/(hr\|director\|owner)/*/analytics/page.tsx` | Pass searchParams + filter options |
| `apps/web/src/lib/portal-nav.ts` | Remove BukuCloud child under Integrations |
| `apps/web/src/app/(hr)/hr/integrations/api/page.tsx` | Tabbed API / BukuCloud / Virtual Hirix |
| `apps/web/src/app/(hr)/hr/integrations/bukucloud/page.tsx` | Redirect to `?tab=bukucloud` |
| `apps/web/src/components/hr/integrations/*` | Tab chrome + Virtual Hirix panel |
| `tests/analytics/*.test.ts` | Period helpers + query shaping unit tests |
| `docs/features.md` | One-liners for cockpit + API tabs |

---

### Task 1: Period helpers + Recharts install

**Files:**
- Create: `apps/web/src/lib/analytics/period.ts`
- Create: `tests/analytics/period.test.ts`
- Modify: `apps/web/package.json` (add `recharts`)

**Interfaces:**
- Produces: `AnalyticsPeriod = "month" | "6m" | "ytd"`; `parseAnalyticsPeriod(raw)`; `periodRange(period, now?) => { start: Date; end: Date; months: string[] /* YYYY-MM */ }`; `parseAnalyticsFilters(searchParams)`.

**Steps:**

- [ ] **Step 1: Write failing tests** for `periodRange("month"|"6m"|"ytd")` (month count / start bounds in Asia/Kuala_Lumpur or local date arithmetic consistent with payroll months)

- [ ] **Step 2: Implement `period.ts`**

- [ ] **Step 3: Run** `pnpm exec vitest run tests/analytics/period.test.ts` — expect PASS

- [ ] **Step 4: Add dependency** `pnpm --filter @hrms/web add recharts`

- [ ] **Step 5: Commit only if user asked**

---

### Task 2: Analytics query layer (aggregates)

**Files:**
- Modify: `apps/web/src/lib/analytics/queries.ts`
- Create: `tests/analytics/queries-shape.test.ts` (pure reducers if extracted; otherwise test exported helpers that bucket months / stages)

**Interfaces:**
- Consumes: `periodRange`, filter ids
- Produces types roughly:
  - `AnalyticsFilterInput { period; branchId?; departmentId? }`
  - `getAnalyticsCockpit(filters)` returning KPIs + series for all charts in the spec
  - Joiners: `employees.join_date` in range (+ branch/dept filters)
  - Leavers: `status in ('terminated','inactive')` with `updated_at` in range as best-effort exit proxy (document in code comment — no `end_date` column)
  - Leave days by month from `leave_requests`
  - Liability by department (extend existing liability math)
  - Payroll monthly gross/net from locked `payroll_payruns` + items
  - Last payrun composition: sum earnings/deductions if columns exist; else skip series with empty flag
  - Recruitment: counts by `job_applications.stage`; open requisitions vs active candidates

**Steps:**

- [ ] **Step 1: Extract/test pure bucketing helpers** (e.g. count by month key, group by stage)

- [ ] **Step 2: Implement filter-aware queries** (reuse org context; apply branch/dept on employee-linked datasets)

- [ ] **Step 3: Keep legacy getters thin wrappers** or migrate pages to `getAnalyticsCockpit` only — prefer one cockpit loader to avoid N+1 page wiring

- [ ] **Step 4: Run analytics unit tests**

- [ ] **Step 5: Commit only if user asked**

---

### Task 3: Detail drawer data + Sheet UI primitive

**Files:**
- Modify: `apps/web/src/lib/analytics/queries.ts` — `getAnalyticsDetail({ chartKey, segmentKey, filters })`
- Create: `apps/web/src/components/ui/sheet.tsx` if missing (match existing shadcn/base-ui patterns used by `dialog.tsx`)
- Create: `apps/web/src/components/analytics/analytics-detail-drawer.tsx`

**Interfaces:**
- `chartKey`: `"headcount_branch" | "headcount_dept" | "joiners_leavers" | "leave_days" | "leave_liability" | "payroll_monthly" | "payroll_composition" | "recruitment_funnel" | "recruitment_open"`
- Returns `{ title: string; columns: string[]; rows: Array<Record<string, string | number>> }`

**Steps:**

- [ ] **Step 1: Implement detail loaders** for each chartKey (cap rows ~100; show count)

- [ ] **Step 2: Add Sheet UI**

- [ ] **Step 3: Wire drawer client component** (open/close, table render)

- [ ] **Step 4: Smoke-typecheck** `pnpm --filter @hrms/web typecheck`

- [ ] **Step 5: Commit only if user asked**

---

### Task 4: Charts + filters + dashboard shell

**Files:**
- Create: `apps/web/src/components/analytics/analytics-filters.tsx` (client; updates URL via `router.push`)
- Create: `apps/web/src/components/analytics/charts/*.tsx` (thin Recharts wrappers: bar, horizontal bar, donut, dual line, stacked bar)
- Rewrite: `apps/web/src/components/analytics/analytics-dashboard.tsx` (client or split server shell + client charts)
- Modify: `apps/web/src/app/(hr)/hr/analytics/page.tsx`, director + owner analytics pages — read `searchParams`, load branches/departments for filter selects, call cockpit loader, pass `hasRecruitment`

**Steps:**

- [ ] **Step 1: Filters component** writing `period` / `branchId` / `departmentId` to URL

- [ ] **Step 2: Chart wrappers** with empty state copy “Not enough data in this period”

- [ ] **Step 3: Dashboard layout** — KPI row → Workforce → Leave → Payroll → Recruitment sections; click handlers open detail drawer via server action or route handler that returns JSON (prefer server action `loadAnalyticsDetailAction`)

- [ ] **Step 4: Wire all three analytics pages**

- [ ] **Step 5: Manual browser check** on `/hr/analytics` with filters + one drawer open

- [ ] **Step 6: Commit only if user asked**

---

### Task 5: Developer API partner tabs + nav cleanup

**Files:**
- Create: `apps/web/src/components/ui/tabs.tsx` if missing
- Create: `apps/web/src/components/hr/integrations/developer-api-tabs.tsx`
- Create: `apps/web/src/components/hr/integrations/virtual-hirix-panel.tsx` (copy: how to use API keys with Virtual Hirix; link to API keys tab; no fake sync form)
- Modify: `apps/web/src/app/(hr)/hr/integrations/api/page.tsx` — tabs `api | bukucloud | virtual-hirix`
- Modify: `apps/web/src/app/(hr)/hr/integrations/bukucloud/page.tsx` — `redirect("/hr/integrations/api?tab=bukucloud")`
- Modify: `apps/web/src/lib/portal-nav.ts` — remove BukuCloud child; keep Developer API + Webhooks
- Modify: `apps/web/src/app/(hr)/hr/integrations/page.tsx` — BukuCloud card href → `/hr/integrations/api?tab=bukucloud`; optional Virtual Hirix card → `?tab=virtual-hirix`
- Modify: payrun BukuCloud link if it points at old path (redirect covers it; update for clarity)

**Steps:**

- [ ] **Step 1: Tabs chrome** reading/writing `?tab=`

- [ ] **Step 2: Embed existing `BukucloudSettingsForm` in BukuCloud tab** (gate with same access helpers as current page)

- [ ] **Step 3: Virtual Hirix panel** (guidance only)

- [ ] **Step 4: Redirect + nav + hub card updates**

- [ ] **Step 5: Browser check** tabs + sidebar no longer shows BukuCloud; old URL redirects

- [ ] **Step 6: Commit only if user asked**

---

### Task 6: Docs + success checklist

**Files:**
- Modify: `docs/features.md`
- Modify: spec success checkboxes if needed

**Steps:**

- [ ] **Step 1: Update features.md** for analytics cockpit + Developer API partner tabs

- [ ] **Step 2: Run** `pnpm exec vitest run tests/analytics` and `pnpm --filter @hrms/web typecheck`

- [ ] **Step 3: Tick success criteria** from the spec

- [ ] **Step 4: Commit only if user asked**

---

## Execution handoff

After this plan is approved by the user, implement with **subagent-driven-development** or **executing-plans**, task-by-task, without editing this plan file unless requirements change.
