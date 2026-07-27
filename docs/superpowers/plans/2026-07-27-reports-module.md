# Reports Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Reports module — HR reports hub with nine filterable report runners (table + CSV + print), quick export shortcuts, Director read-only portal, auditor permission access, and export audit logging.

**Architecture:** Read-only query layer in `apps/web/src/lib/reports/` with no new DB tables. Shared UI components (`ReportFilterBar`, `ReportRunner`, `ReportPrintLayout`) power both `/hr/reports` and `/director/reports`. Session loads `permissions[]` for auditor checks; middleware whitelists `/hr/reports` for auditors without `hr_administrator` role.

**Tech Stack:** Next.js App Router, Supabase PostgreSQL + RLS, shadcn/ui (`Table`, `Button`, `Card`, `Select`, `Input`), Vitest, `logAuditEvent`, existing module queries (`hr/documents`, `assets/queries`, `calendar/export`).

**Spec:** [2026-07-27-reports-module-design.md](../specs/2026-07-27-reports-module-design.md)

## Global Constraints

- Tenant isolation: every query filters by `organization_id`; use `DEFAULT_ORGANIZATION_ID` in standalone mode.
- Auth: HR reports via `requireReportsAccess()` (`hr_administrator` or `auditor` permission); Director via `requireRole("director")`.
- Auditors: read-only on `/hr/reports/*` only — middleware must block other `/hr/*` paths.
- No scheduled/email reports, no Enterprise analytics, no payroll statutory generation in Reports.
- Export cap: **5,000 rows** per CSV; UI pagination **50 rows/page**.
- All CSV and print actions log `report.exported` via `logAuditEvent`.
- Managers: no reports hub (unchanged team pages).
- Reuse Documents hub card pattern and calendar print pattern (`print:hidden` + `window.print()`).

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/domain/src/reports/dates.ts` | Date preset helpers (`thisMonth`, `ytd`, etc.) |
| `packages/domain/src/reports/dates.test.ts` | Preset unit tests |
| `packages/domain/src/reports/csv.ts` | `rowsToCsv` with RFC4180 escaping |
| `packages/domain/src/reports/csv.test.ts` | CSV escaping tests |
| `packages/domain/src/index.ts` | Re-export reports helpers |
| `apps/web/src/lib/auth/session.ts` | Add `permissions` to `UserMembership` |
| `apps/web/src/lib/auth/routes.ts` | `canAccessPath(pathname, roles, permissions)` |
| `apps/web/src/lib/supabase/middleware.ts` | Load permissions; auditor `/hr/reports` whitelist |
| `apps/web/src/lib/reports/types.ts` | `ReportSlug`, `ReportFilters`, row types |
| `apps/web/src/lib/reports/catalog.ts` | Report metadata (title, description, filter schema) |
| `apps/web/src/lib/reports/access.ts` | `requireReportsAccess`, `canAccessReports` |
| `apps/web/src/lib/reports/filters.ts` | Parse URL searchParams → `ReportFilters` |
| `apps/web/src/lib/reports/filters.test.ts` | Filter parsing tests |
| `apps/web/src/lib/reports/audit.ts` | `logReportExport(slug, format, filters)` |
| `apps/web/src/lib/reports/leave-balances.ts` | Org leave balance query |
| `apps/web/src/lib/reports/leave-usage.ts` | Leave requests in range |
| `apps/web/src/lib/reports/attendance-daily.ts` | Daily attendance log |
| `apps/web/src/lib/reports/attendance-summary.ts` | Per-employee attendance rollup |
| `apps/web/src/lib/reports/headcount.ts` | Headcount breakdown + detail list |
| `apps/web/src/lib/reports/document-compliance.ts` | Wrapper + flat rows for CSV |
| `apps/web/src/lib/reports/asset-register.ts` | Wrapper + flat rows for CSV |
| `apps/web/src/lib/reports/claims-ot.ts` | Claims + OT merged rows |
| `apps/web/src/lib/reports/performance-snapshot.ts` | Appraisal snapshot query |
| `apps/web/src/lib/reports/export.ts` | Per-report CSV column mappers |
| `apps/web/src/lib/hr/documents-export.ts` | `complianceMatrixToCsv` |
| `apps/web/src/lib/assets/export.ts` | `assetsToCsv` |
| `apps/web/src/components/reports/report-filter-bar.tsx` | Shared filters UI |
| `apps/web/src/components/reports/report-runner.tsx` | Table + CSV + print shell |
| `apps/web/src/components/reports/report-print-layout.tsx` | Print-only table layout |
| `apps/web/src/components/reports/reports-hub.tsx` | Hub card grid |
| `apps/web/src/app/(hr)/hr/reports/layout.tsx` | `requireReportsAccess()` |
| `apps/web/src/app/(hr)/hr/reports/page.tsx` | HR hub |
| `apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx` | HR report runner |
| `apps/web/src/app/(hr)/hr/reports/actions.ts` | CSV export server actions |
| `apps/web/src/app/(director)/director/reports/page.tsx` | Director hub |
| `apps/web/src/app/(director)/director/reports/[slug]/page.tsx` | Director report runner |
| `apps/web/src/lib/portal-nav.ts` | Director Reports nav item |
| `scripts/seed-role-accounts.ts` | Optional auditor demo account |
| `tests/integration/reports.test.ts` | Access matrix tests |
| `scripts/smoke-test.ts` | Reports route guards |

---

### Task 1: Domain helpers + session permissions + access layer

**Files:**
- Create: `packages/domain/src/reports/dates.ts`
- Create: `packages/domain/src/reports/dates.test.ts`
- Create: `packages/domain/src/reports/csv.ts`
- Create: `packages/domain/src/reports/csv.test.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `apps/web/src/lib/auth/session.ts`
- Modify: `apps/web/src/lib/auth/routes.ts`
- Modify: `apps/web/src/lib/supabase/middleware.ts`
- Create: `apps/web/src/lib/reports/types.ts`
- Create: `apps/web/src/lib/reports/access.ts`
- Create: `apps/web/src/lib/reports/filters.ts`
- Create: `apps/web/src/lib/reports/filters.test.ts`
- Create: `apps/web/src/lib/reports/audit.ts`
- Create: `apps/web/src/lib/reports/catalog.ts`

**Interfaces:**
- Produces: `resolveDatePreset(preset: DatePreset, today: string): { from: string; to: string }`
- Produces: `rowsToCsv(headers: string[], rows: string[][]): string`
- Produces: `UserMembership.permissions: string[]`
- Produces: `canAccessPath(pathname: string, roles: string[], permissions: string[]): boolean`
- Produces: `requireReportsAccess(): Promise<AuthSession>`
- Produces: `parseReportFilters(searchParams: Record<string, string | string[] | undefined>): ReportFilters`
- Produces: `logReportExport(input: { slug: ReportSlug; format: "csv" | "print"; filters: ReportFilters }): Promise<void>`
- Produces: `REPORT_CATALOG: ReportDefinition[]` with slugs matching spec §3

- [ ] **Step 1: Write failing domain tests**

Create `packages/domain/src/reports/dates.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { resolveDatePreset } from "./dates";

describe("resolveDatePreset", () => {
  it("returns this month bounds", () => {
    expect(resolveDatePreset("this_month", "2026-07-15")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("returns YTD bounds", () => {
    expect(resolveDatePreset("ytd", "2026-07-15")).toEqual({
      from: "2026-01-01",
      to: "2026-07-15",
    });
  });
});
```

Create `packages/domain/src/reports/csv.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { rowsToCsv } from "./csv";

describe("rowsToCsv", () => {
  it("escapes quotes in cells", () => {
    const csv = rowsToCsv(["name"], [['Say "hi"']]);
    expect(csv).toBe('name\n"Say ""hi"""');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/domain/src/reports --maxWorkers=1`

Expected: FAIL — modules not found

- [ ] **Step 3: Implement domain helpers**

Create `packages/domain/src/reports/dates.ts`:

```typescript
export type DatePreset = "this_month" | "last_month" | "this_quarter" | "ytd" | "custom";

export function resolveDatePreset(
  preset: DatePreset,
  today: string,
): { from: string; to: string } {
  const [year, month] = today.split("-").map(Number);
  const endOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

  if (preset === "this_month") {
    const last = endOfMonth(year, month);
    return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}` };
  }

  if (preset === "last_month") {
    const d = new Date(Date.UTC(year, month - 2, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const last = endOfMonth(y, m);
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }

  if (preset === "this_quarter") {
    const qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const qEndMonth = qStartMonth + 2;
    const last = endOfMonth(year, qEndMonth);
    return {
      from: `${year}-${String(qStartMonth).padStart(2, "0")}-01`,
      to: `${year}-${String(qEndMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }

  // ytd + custom fallback: caller supplies from/to when custom
  return { from: `${year}-01-01`, to: today };
}
```

Create `packages/domain/src/reports/csv.ts`:

```typescript
function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCell(String(cell ?? ""))).join(","));
  }
  return lines.join("\n");
}
```

Export from `packages/domain/src/index.ts`.

- [ ] **Step 4: Extend session + routes + middleware**

In `session.ts`, load `permissions` from `organization_memberships`:

```typescript
export type UserMembership = {
  organizationId: string;
  employeeId: string | null;
  roles: string[];
  permissions: string[];
};
```

Update `loadMembership` select: `"organization_id, employee_id, roles, permissions"`.

In `routes.ts`, add:

```typescript
export function isReportsPath(pathname: string): boolean {
  return pathname === "/hr/reports" || pathname.startsWith("/hr/reports/");
}

export function canAccessPath(
  pathname: string,
  roles: readonly string[],
  permissions: readonly string[] = [],
): boolean {
  if (isReportsPath(pathname) && permissions.includes("auditor")) {
    return true;
  }
  return canAccessPortal(pathname, roles);
}
```

Update `middleware.ts` `getMembershipRoles` → `getMembership` returning `{ roles, permissions }`; call `canAccessPath(pathname, roles, permissions)`.

- [ ] **Step 5: Implement reports access + filters**

Create `apps/web/src/lib/reports/types.ts`:

```typescript
import type { DatePreset } from "@hrms/domain";

export const REPORT_SLUGS = [
  "leave-balances",
  "leave-usage",
  "attendance-daily",
  "attendance-summary",
  "headcount",
  "document-compliance",
  "asset-register",
  "claims-ot",
  "performance-snapshot",
] as const;

export type ReportSlug = (typeof REPORT_SLUGS)[number];

export type EmploymentStatusFilter = "all" | "active" | "inactive" | "on_leave";

export type ReportFilters = {
  preset: DatePreset;
  from: string;
  to: string;
  asOf: string;
  branchId?: string;
  departmentId?: string;
  employmentStatus: EmploymentStatusFilter;
  employeeQuery?: string;
  reviewCycleId?: string;
  assetStatus?: string;
  assetCategoryId?: string;
  page: number;
  pageSize: number;
};
```

Create `apps/web/src/lib/reports/access.ts`:

```typescript
import { redirect } from "next/navigation";

import { requireAuth, type AuthSession } from "@/lib/auth/session";

export function canAccessReports(session: AuthSession): boolean {
  return (
    session.membership.roles.includes("hr_administrator") ||
    session.membership.permissions.includes("auditor")
  );
}

export async function requireReportsAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!canAccessReports(session)) redirect("/unauthorized");
  return session;
}
```

Create `apps/web/src/lib/reports/filters.ts` — parse URL params, call `resolveDatePreset` when preset !== `custom`, default `pageSize: 50`.

Create `apps/web/src/lib/reports/audit.ts`:

```typescript
import { logAuditEvent } from "@/lib/audit/log-event";
import { requireAuth } from "@/lib/auth/session";

import type { ReportFilters, ReportSlug } from "./types";

export async function logReportExport(input: {
  slug: ReportSlug;
  format: "csv" | "print";
  filters: ReportFilters;
}): Promise<void> {
  const session = await requireAuth();
  await logAuditEvent({
    organizationId: session.membership.organizationId,
    actorUserId: session.user.id,
    action: "report.exported",
    resourceType: "report",
    resourceId: input.slug,
    metadata: { format: input.format, filters: input.filters },
  });
}
```

Create `apps/web/src/lib/reports/catalog.ts` with `REPORT_CATALOG` array (slug, title, description, `usesDateRange`, `usesAsOf` flags per spec §3).

- [ ] **Step 6: Run tests**

Run: `pnpm exec vitest run packages/domain/src/reports apps/web/src/lib/reports/filters.test.ts --maxWorkers=1`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/reports packages/domain/src/index.ts \
  apps/web/src/lib/auth/session.ts apps/web/src/lib/auth/routes.ts \
  apps/web/src/lib/supabase/middleware.ts apps/web/src/lib/reports
git commit -m "Add reports foundation: date presets, CSV helper, access layer, and auditor path whitelist."
```

---

### Task 2: Shared report UI components

**Files:**
- Create: `apps/web/src/components/reports/report-filter-bar.tsx`
- Create: `apps/web/src/components/reports/report-print-layout.tsx`
- Create: `apps/web/src/components/reports/report-runner.tsx`
- Create: `apps/web/src/components/reports/reports-hub.tsx`

**Interfaces:**
- Consumes: `ReportFilters`, `ReportDefinition` from catalog
- Produces: `ReportFilterBar({ filters, branches, departments, onChange })` — client component, syncs URL via `useRouter` + `useSearchParams`
- Produces: `ReportRunner({ title, description, columns, rows, total, filters, slug, portal })` — table + Export CSV + Print buttons
- Produces: `ReportPrintLayout({ title, filterSummary, columns, rows })` — `hidden print:block`
- Produces: `ReportsHub({ portal, basePath })` — card grid with operational reports + quick exports + payroll card

- [ ] **Step 1: ReportFilterBar**

Client component with:
- Preset `Select`: This month, Last month, This quarter, YTD, Custom
- Date inputs (shown when custom or for reports needing range)
- Branch / Department `Select` (options from server props)
- Employment status `Select`
- Employee search `Input` (debounce 300ms → update `?q=`)
- **Reset filters** button

Use shadcn `Select`, `Input`, `Button`, `Label`.

- [ ] **Step 2: ReportPrintLayout**

Mirror `CalendarPrintLayout` structure:
- Title, generated timestamp (`new Date().toLocaleString("en-MY")`), filter summary line
- Simple HTML `<table>` with column headers + rows (all rows for print, not just current page)

- [ ] **Step 3: ReportRunner**

Props:
```typescript
type ReportRunnerProps = {
  portal: "hr" | "director";
  slug: ReportSlug;
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  total: number;
  filters: ReportFilters;
  filterSummary: string;
  exportAction: (slug: ReportSlug, filters: ReportFilters) => Promise<{ csv: string; filename: string }>;
};
```

- Paginate `rows` client-side or server-side (prefer server passing sliced page + total)
- **Download CSV** button → calls server action → `logReportExport` inside action → triggers browser download via blob
- **Print** button → `logReportExport({ format: "print" })` via server action then `window.print()`
- Wrap main chrome in `print:hidden`
- Show banner when `total > 5000`: "Export limited to 5,000 rows"

- [ ] **Step 4: ReportsHub**

Two sections per spec §3:
1. **Operational reports** — map `REPORT_CATALOG` to cards linking `{basePath}/{slug}`
2. **Quick exports** — Calendar CSV (`/hr/calendar`), Compliance (`/hr/documents/compliance`), Assets (`/hr/assets`)
3. **Payroll & statutory** card → `/hr/payroll` with copy from spec §9

Reuse Documents hub `Card` + `PortalIcon` pattern.

- [ ] **Step 5: Manual verify**

Import components in a Storybook-free check: ensure `ReportRunner` renders without type errors (`pnpm typecheck` in Task 10).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/reports
git commit -m "Add shared reports UI: filter bar, runner, print layout, and hub."
```

---

### Task 3: HR reports hub + layout + routes scaffold

**Files:**
- Create: `apps/web/src/app/(hr)/hr/reports/layout.tsx`
- Modify: `apps/web/src/app/(hr)/hr/reports/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx`
- Create: `apps/web/src/app/(hr)/hr/reports/actions.ts`

**Interfaces:**
- Consumes: `requireReportsAccess`, `ReportsHub`, `REPORT_CATALOG`
- Produces: `exportReportCsv(slug: ReportSlug, filters: ReportFilters): Promise<{ csv: string; filename: string }>`

- [ ] **Step 1: Layout guard**

`apps/web/src/app/(hr)/hr/reports/layout.tsx`:

```typescript
import { requireReportsAccess } from "@/lib/reports/access";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireReportsAccess();
  return children;
}
```

- [ ] **Step 2: Hub page**

Replace scaffold with server page loading branches/departments for filter options (optional on hub), render:

```tsx
<ReportsHub portal="hr" basePath="/hr/reports" />
```

- [ ] **Step 3: Dynamic slug page scaffold**

`[slug]/page.tsx`:
- Validate slug against `REPORT_SLUGS`; `notFound()` if invalid
- Parse filters from `searchParams`
- Switch on slug → call report query (stub empty data initially; filled in Tasks 4–8)
- Load branch/department options for filter bar
- Render `ReportFilterBar` + `ReportRunner`

- [ ] **Step 4: CSV export action**

`actions.ts`:

```typescript
"use server";

import { rowsToCsv } from "@hrms/domain";
import { logReportExport } from "@/lib/reports/audit";
import { getReportCsvRows } from "@/lib/reports/export";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";
import { requireReportsAccess } from "@/lib/reports/access";

export async function exportReportCsv(slug: ReportSlug, filters: ReportFilters) {
  await requireReportsAccess();
  const { headers, rows, filename } = await getReportCsvRows(slug, filters);
  await logReportExport({ slug, format: "csv", filters });
  return { csv: rowsToCsv(headers, rows), filename };
}

export async function logReportPrint(slug: ReportSlug, filters: ReportFilters) {
  await requireReportsAccess();
  await logReportExport({ slug, format: "print", filters });
}
```

- [ ] **Step 5: Manual verify**

Visit `/hr/reports` as HR admin — hub renders. Visit `/hr/reports/leave-balances` — runner shell with empty table.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(hr)/hr/reports
git commit -m "Add HR reports hub, layout guard, and dynamic report route scaffold."
```

---

### Task 4: Leave reports (balances + usage)

**Files:**
- Create: `apps/web/src/lib/reports/leave-balances.ts`
- Create: `apps/web/src/lib/reports/leave-usage.ts`
- Modify: `apps/web/src/lib/reports/export.ts`
- Modify: `apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx`

**Interfaces:**
- Produces: `listLeaveBalanceRows(filters: ReportFilters): Promise<{ rows: LeaveBalanceRow[]; total: number }>`
- Produces: `listLeaveUsageRows(filters: ReportFilters): Promise<{ rows: LeaveUsageRow[]; total: number }>`

`LeaveBalanceRow`: employeeNumber, employeeName, branch, department, leaveTypeName, entitlementDays, usedDays, pendingDays, remainingDays

`LeaveUsageRow`: employeeNumber, employeeName, leaveTypeName, startDate, endDate, days, status

- [ ] **Step 1: Leave balances query**

For filtered employees:
1. Query `employees` with branch/department joins + employment status filter
2. Load org `leave_types`
3. Query `leave_requests` for calendar year of `filters.asOf` (or `filters.to`) grouped by employee + type
4. Compute used (approved), pending (pending), remaining

Cap export at 5000 rows in query layer.

- [ ] **Step 2: Leave usage query**

Query `leave_requests` where `start_date <= to` AND `end_date >= from`, join employee dimensions, filter by status in approved/pending.

- [ ] **Step 3: Wire into slug page + export.ts**

Add CSV mappers for both slugs.

- [ ] **Step 4: Manual verify**

HR admin: leave balances shows demo employees; filter by branch; CSV downloads; audit row in `/hr/audit`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/reports/leave-balances.ts apps/web/src/lib/reports/leave-usage.ts \
  apps/web/src/lib/reports/export.ts apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx
git commit -m "Add leave balance and leave usage reports."
```

---

### Task 5: Attendance reports (daily + summary)

**Files:**
- Create: `apps/web/src/lib/reports/attendance-daily.ts`
- Create: `apps/web/src/lib/reports/attendance-summary.ts`
- Modify: `apps/web/src/lib/reports/export.ts`
- Modify: `apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx`

**Interfaces:**
- Produces: `listAttendanceDailyRows(filters): Promise<{ rows: AttendanceDailyRow[]; total: number }>`
- Produces: `listAttendanceSummaryRows(filters): Promise<{ rows: AttendanceSummaryRow[]; total: number }>`

`AttendanceDailyRow`: employeeNumber, employeeName, workDate, session, clockIn, clockOut, status, branch, department

`AttendanceSummaryRow`: employeeNumber, employeeName, daysPresent, daysAbsent, daysLate, totalHours

- [ ] **Step 1: Daily log query**

`attendance_records` where `work_date` between `from`/`to`, join `employees` → `branches`, `departments`.

- [ ] **Step 2: Summary aggregation**

Group daily rows per employee:
- `daysPresent`: sessions with `clock_in_at` not null
- `daysLate`: `status === 'late'` (or existing convention)
- `daysAbsent`: employees with no record on working days — v1 simplify: count rows where status indicates absent
- `totalHours`: sum of `(clock_out - clock_in)` hours where both set

- [ ] **Step 3: Wire slug page + CSV export**

- [ ] **Step 4: Manual verify**

Date preset "This month" returns records; CSV + print work.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/reports/attendance-daily.ts apps/web/src/lib/reports/attendance-summary.ts \
  apps/web/src/lib/reports/export.ts apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx
git commit -m "Add attendance daily log and summary reports."
```

---

### Task 6: Headcount report

**Files:**
- Create: `apps/web/src/lib/reports/headcount.ts`
- Modify: `apps/web/src/lib/reports/export.ts`
- Modify: `apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx`

**Interfaces:**
- Produces: `getHeadcountReport(filters): Promise<{ summary: HeadcountSummary[]; employees: HeadcountEmployeeRow[]; total: number }>`

- [ ] **Step 1: Summary breakdown**

Aggregate `employees` by branch + department + status as of `filters.asOf` (use `status` field; `on_leave` if applicable).

Render summary table above detail list when `?detail=1` or always show both sections.

- [ ] **Step 2: Employee detail rows**

employeeNumber, fullName, branch, department, employmentType, status, startDate

- [ ] **Step 3: Wire page + CSV** (export summary + detail as separate sections or flat rows with `row_type` column)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/reports/headcount.ts apps/web/src/lib/reports/export.ts \
  apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx
git commit -m "Add headcount report with branch and department breakdown."
```

---

### Task 7: Document compliance + asset register + module CSV exports

**Files:**
- Create: `apps/web/src/lib/reports/document-compliance.ts`
- Create: `apps/web/src/lib/reports/asset-register.ts`
- Create: `apps/web/src/lib/hr/documents-export.ts`
- Create: `apps/web/src/lib/assets/export.ts`
- Modify: `apps/web/src/app/(hr)/hr/documents/compliance/page.tsx` (or `compliance-matrix.tsx`)
- Modify: `apps/web/src/components/hr/assets/*` register toolbar
- Modify: `apps/web/src/lib/reports/export.ts`

**Interfaces:**
- Produces: `listDocumentComplianceRows(filters): Promise<{ rows: FlatComplianceRow[]; total: number }>` — wraps `buildComplianceMatrix()`
- Produces: `listAssetRegisterRows(filters): Promise<{ rows: AssetRegisterRow[]; total: number }>` — wraps `listAssets()`
- Produces: `complianceMatrixToCsv(rows: FlatComplianceRow[]): string`
- Produces: `assetsToCsv(rows: AssetListRow[]): string`

- [ ] **Step 1: Flatten compliance matrix**

Long format: employeeNumber, employeeName, requiredDocumentName, status, expiresAt

- [ ] **Step 2: Asset register rows**

Map `AssetListRow` to report columns: name, category, serial, status, assignee, branch, purchaseValue, warrantyExpiry

Add optional status/category filters from `ReportFilters`.

- [ ] **Step 3: Module CSV buttons**

Add **Export CSV** to compliance page toolbar calling `complianceMatrixToCsv` + `logReportExport({ slug: "document-compliance", ... })`.

Add **Export CSV** to HR assets register toolbar calling `assetsToCsv` + audit log.

- [ ] **Step 4: Wire report runners for both slugs**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/reports/document-compliance.ts apps/web/src/lib/reports/asset-register.ts \
  apps/web/src/lib/hr/documents-export.ts apps/web/src/lib/assets/export.ts \
  apps/web/src/app/(hr)/hr/documents apps/web/src/components/hr/assets apps/web/src/lib/reports/export.ts
git commit -m "Add document compliance and asset register reports with module CSV exports."
```

---

### Task 8: Claims/OT + performance snapshot

**Files:**
- Create: `apps/web/src/lib/reports/claims-ot.ts`
- Create: `apps/web/src/lib/reports/performance-snapshot.ts`
- Modify: `apps/web/src/lib/reports/export.ts`
- Modify: `apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx`

**Interfaces:**
- Produces: `listClaimsOtRows(filters): Promise<{ rows: ClaimsOtRow[]; total: number }>`
- Produces: `listPerformanceSnapshotRows(filters): Promise<{ rows: PerformanceSnapshotRow[]; total: number }>`

`ClaimsOtRow`: kind (`claim` | `overtime`), employeeNumber, employeeName, date, description, amountOrHours, status

`PerformanceSnapshotRow`: employeeNumber, employeeName, cycleName, status, selfRating, managerRating

- [ ] **Step 1: Claims query**

`claims` joined to employees where `claim_date` (or `created_at::date`) in range.

- [ ] **Step 2: OT query**

`overtime_requests` where `work_date` in range.

- [ ] **Step 3: Merge with `kind` column** — single table sorted by date desc.

- [ ] **Step 4: Performance snapshot**

Query `performance_appraisals` join `review_cycles`; filter by `reviewCycleId` when set; default all non-archived cycles.

- [ ] **Step 5: Wire pages + CSV**

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/reports/claims-ot.ts apps/web/src/lib/reports/performance-snapshot.ts \
  apps/web/src/lib/reports/export.ts apps/web/src/app/(hr)/hr/reports/[slug]/page.tsx
git commit -m "Add claims/OT and performance snapshot reports."
```

---

### Task 9: Director portal reports

**Files:**
- Create: `apps/web/src/app/(director)/director/reports/page.tsx`
- Create: `apps/web/src/app/(director)/director/reports/[slug]/page.tsx`
- Modify: `apps/web/src/lib/portal-nav.ts`

**Interfaces:**
- Reuses: `ReportsHub`, `ReportRunner`, all report query functions
- `portal="director"`, `basePath="/director/reports"`
- Director export actions call `requireRole("director")` instead of `requireReportsAccess`

- [ ] **Step 1: Director hub page**

```typescript
import { requireRole } from "@/lib/auth/session";
import { ReportsHub } from "@/components/reports/reports-hub";

export default async function Page() {
  await requireRole("director");
  return <ReportsHub portal="director" basePath="/director/reports" />;
}
```

- [ ] **Step 2: Director slug page**

Copy HR `[slug]/page.tsx` but:
- `requireRole("director")`
- `portal="director"`
- Hide links to HR mutation routes (employee profile links OK as read-only)
- Use director-scoped export actions (duplicate thin wrapper or pass `access: "director"` to shared action)

- [ ] **Step 3: Portal nav**

In `portal-nav.ts`, replace director `singleDashboard` with:

```typescript
case "Director":
  return [
    {
      items: [
        { href: "/director/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/director/reports", label: "Reports", icon: "reports" },
      ],
    },
  ];
```

- [ ] **Step 4: Manual verify**

Login as `director@...` — hub + leave balances work; cannot access `/hr/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(director)/director/reports apps/web/src/lib/portal-nav.ts
git commit -m "Add Director read-only reports portal and navigation."
```

---

### Task 10: Auditor seed, tests, smoke test, docs

**Files:**
- Modify: `scripts/seed-role-accounts.ts` — add `--auditor-email` or append `auditor` permission to HR demo user variant
- Create: `tests/integration/reports.test.ts`
- Modify: `scripts/smoke-test.ts`
- Modify: `docs/features.md`
- Modify: `docs/superpowers/specs/2026-07-27-reports-module-design.md` — §13 exit criteria checkboxes

- [ ] **Step 1: Integration tests**

```typescript
import { describe, expect, it } from "vitest";

import { canAccessPath } from "../../apps/web/src/lib/auth/routes";
import { canAccessReports } from "../../apps/web/src/lib/reports/access";

describe("reports access", () => {
  it("allows hr administrator", () => {
    expect(
      canAccessReports({
        user: { id: "1", email: "a@b.c" },
        membership: { organizationId: "o", employeeId: null, roles: ["hr_administrator"], permissions: [] },
      }),
    ).toBe(true);
  });

  it("allows auditor permission without hr role", () => {
    expect(
      canAccessReports({
        user: { id: "1", email: "a@b.c" },
        membership: { organizationId: "o", employeeId: null, roles: ["employee"], permissions: ["auditor"] },
      }),
    ).toBe(true);
  });

  it("whitelists auditor on reports path only", () => {
    expect(canAccessPath("/hr/reports/leave-balances", [], ["auditor"])).toBe(true);
    expect(canAccessPath("/hr/dashboard", [], ["auditor"])).toBe(false);
  });
});
```

- [ ] **Step 2: Smoke test additions**

```typescript
const reportsGuard = await fetchStatus(`${baseUrl}/hr/reports`);
if (reportsGuard.status === 307 && reportsGuard.location?.includes("/auth/login")) {
  pass("Reports", "Unauthenticated /hr/reports redirects to login");
} else {
  fail("Reports", "Unauthenticated /hr/reports redirects to login", `status ${reportsGuard.status}`);
}

const directorReportsGuard = await fetchStatus(`${baseUrl}/director/reports`);
// same pattern
```

- [ ] **Step 3: Seed auditor QA account**

Add to seed script: create `auditor@demo.hrms.local` with `roles: ["employee"]`, `permissions: ["auditor"]`.

- [ ] **Step 4: Update docs**

`docs/features.md` §14: HR reports hub ✅  
`docs/features.md` §15: Director Reports ✅

- [ ] **Step 5: Run verification**

Run: `pnpm typecheck`  
Run: `pnpm exec vitest run packages/domain/src/reports apps/web/src/lib/reports tests/integration/reports.test.ts --maxWorkers=1`  
Run: `pnpm smoke-test` (with env loaded)

Expected: all pass

- [ ] **Step 6: Mark spec exit criteria**

Check all boxes in spec §13.

- [ ] **Step 7: Commit**

```bash
git add tests/integration/reports.test.ts scripts/smoke-test.ts scripts/seed-role-accounts.ts docs/features.md \
  docs/superpowers/specs/2026-07-27-reports-module-design.md
git commit -m "Add reports tests, smoke checks, auditor seed, and documentation."
```

---

## Self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| HR hub + 9 reports | Tasks 3–8 |
| Shared filter bar | Task 2 |
| CSV + print + audit | Tasks 2, 3, 10 |
| Director read-only | Task 9 |
| Auditor permission | Task 1, 10 |
| Module export shortcuts | Tasks 2, 7 |
| Payroll link card | Task 2 |
| No scheduled reports | Global constraints |
| 5000 row cap | Tasks 4–8 query layers |
| docs/features.md | Task 10 |
