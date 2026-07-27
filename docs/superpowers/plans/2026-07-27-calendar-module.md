# Calendar Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full Calendar module — employee/manager/HR views with month grid + mobile agenda, leave + holidays aggregation, HR company events CRUD, filters, CSV export, and print.

**Architecture:** Pure domain helpers in `packages/domain/src/calendar/` expand multi-day records into day events. Server queries in `apps/web/src/lib/calendar/` fetch leave/holidays/company_events per role. Shared shadcn UI in `components/calendar/` powers all three routes. New `company_events` table for HR-only events.

**Tech Stack:** Next.js App Router, Supabase PostgreSQL + RLS, Zod (`@hrms/validation`), shadcn/ui (`Card`, `Dialog`, `Badge`, `Button`, `Checkbox`, `Select`, `Sheet`), Vitest.

**Spec:** [2026-07-27-calendar-module-design.md](../specs/2026-07-27-calendar-module-design.md)

## Global Constraints

- Tenant isolation: every query filters by `organization_id`; RLS on `company_events`.
- Timezone: business dates are `YYYY-MM-DD` in Asia/Kuala_Lumpur; no `timestamptz` on calendar day cells.
- Auth: employee routes use `requireEmployeeContext()`; manager uses `requireManagerContext()`; HR uses `requireRole("hr_administrator")`.
- Module gate: add `"calendar"` to `ModuleKey` + `CORE_MODULES`; call `requireModule("calendar")` on all calendar pages/actions.
- Leave statuses on calendar: **`pending`** and **`approved`** only.
- Employee calendar: leave + holidays only (no company events in v1).
- Manager calendar: direct reports + self.
- Holiday admin stays at `/hr/organization/holidays` — calendar never duplicates CRUD.
- UI: custom month grid (no FullCalendar); match shadcn patterns from `components/hr/hr-ui.tsx` and announcements module.
- `DEPLOYMENT_MODE=standalone`: `DEFAULT_ORGANIZATION_ID` env for org scope.

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260727200000_company_events.sql` | `company_events` table + RLS |
| `packages/domain/src/calendar/events.ts` | Date expansion + merge helpers |
| `packages/domain/src/calendar/events.test.ts` | Domain unit tests |
| `packages/domain/src/index.ts` | Re-export calendar |
| `packages/validation/src/calendar.ts` | `companyEventFormSchema` |
| `packages/validation/src/index.ts` | Export calendar schemas |
| `packages/platform/src/entitlements/types.ts` | Add `calendar` module key |
| `apps/web/src/lib/calendar/types.ts` | `CalendarEvent`, filter types |
| `apps/web/src/lib/calendar/queries.ts` | Employee/manager/HR fetchers |
| `apps/web/src/lib/calendar/export.ts` | CSV rows + print metadata |
| `apps/web/src/lib/calendar/company-events.ts` | HR company event CRUD |
| `apps/web/src/app/(hr)/hr/calendar/actions.ts` | Server actions |
| `apps/web/src/components/calendar/*.tsx` | Shared UI |
| `apps/web/src/app/(employee)/employee/calendar/page.tsx` | Employee page |
| `apps/web/src/app/(manager)/manager/team-calendar/page.tsx` | Manager page |
| `apps/web/src/app/(hr)/hr/calendar/page.tsx` | HR page |
| `tests/integration/calendar-events.test.ts` | Domain + filter tests |
| `scripts/smoke-test.ts` | Route + `company_events` checks |

---

### Task 1: Domain helpers + migration + validation

**Files:**
- Create: `packages/domain/src/calendar/events.ts`
- Create: `packages/domain/src/calendar/events.test.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `supabase/migrations/20260727200000_company_events.sql`
- Create: `packages/validation/src/calendar.ts`
- Modify: `packages/validation/src/index.ts`
- Modify: `packages/platform/src/entitlements/types.ts`

**Interfaces:**
- Produces: `expandDateRangeToDays(start: string, end: string): string[]`
- Produces: `calendarMonthBounds(year: number, month: number): { gridStart: string; gridEnd: string; weeks: string[][] }`
- Produces: `mergeEventsForDay(date: string, events: CalendarDayEvent[]): CalendarDayEvent[]`
- Produces: `companyEventFormSchema` in `@hrms/validation`

- [ ] **Step 1: Write failing domain tests**

Create `packages/domain/src/calendar/events.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  calendarMonthBounds,
  expandDateRangeToDays,
  expandLeaveRequestDays,
  mergeEventsForDay,
} from "./events";

describe("expandDateRangeToDays", () => {
  it("expands inclusive range", () => {
    expect(expandDateRangeToDays("2026-07-01", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });
});

describe("expandLeaveRequestDays", () => {
  it("marks half day on end date only", () => {
    const days = expandLeaveRequestDays({
      id: "lr1",
      startDate: "2026-07-10",
      endDate: "2026-07-11",
      halfDay: true,
      status: "approved",
      leaveTypeName: "Annual Leave",
      employeeName: "Ali",
    });
    expect(days).toHaveLength(2);
    expect(days[1]?.title).toContain("½");
  });
});

describe("mergeEventsForDay", () => {
  it("orders holiday before company before leave", () => {
    const sorted = mergeEventsForDay("2026-07-01", [
      { kind: "leave", sortKey: "leave:1" },
      { kind: "holiday", sortKey: "holiday:1" },
      { kind: "company_event", sortKey: "company:1" },
    ] as never);
    expect(sorted.map((e) => e.kind)).toEqual(["holiday", "company_event", "leave"]);
  });
});

describe("calendarMonthBounds", () => {
  it("pads month to Mon-start weeks", () => {
    const { weeks } = calendarMonthBounds(2026, 7); // July 2026
    expect(weeks[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(weeks.at(-1)?.length).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/domain/src/calendar/events.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement domain helpers**

Create `packages/domain/src/calendar/events.ts`:

```typescript
export type CalendarEventKind = "leave" | "holiday" | "company_event";

export type CalendarDayEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  date: string;
  status?: "pending" | "approved";
  leaveTypeName?: string;
  employeeId?: string;
  employeeName?: string;
  branchId?: string | null;
  branchName?: string | null;
  companyEventKind?: string;
  href?: string;
  approvalStepId?: string | null;
  sourceId: string;
  sortKey: string;
};

const KIND_ORDER: Record<CalendarEventKind, number> = {
  holiday: 0,
  company_event: 1,
  leave: 2,
};

export function expandDateRangeToDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    const next = new Date(`${cursor}T00:00:00`);
    next.setDate(next.getDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return days;
}

export function expandLeaveRequestDays(input: {
  id: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  status: "pending" | "approved";
  leaveTypeName: string;
  employeeName: string;
  employeeId?: string;
  approvalStepId?: string | null;
  href?: string;
}): CalendarDayEvent[] {
  const days = expandDateRangeToDays(input.startDate, input.endDate);
  return days.map((date, index) => {
    const isLast = index === days.length - 1;
    const halfSuffix = input.halfDay && isLast ? " ½" : "";
    return {
      id: `${input.id}:${date}`,
      kind: "leave",
      title: `${input.employeeName} · ${input.leaveTypeName}${halfSuffix}`,
      date,
      status: input.status,
      leaveTypeName: input.leaveTypeName,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      approvalStepId: input.approvalStepId ?? null,
      href: input.href,
      sourceId: input.id,
      sortKey: `leave:${input.id}:${date}`,
    };
  });
}

export function expandHolidayDay(input: {
  id: string;
  name: string;
  holidayDate: string;
  branchId?: string | null;
  branchName?: string | null;
}): CalendarDayEvent {
  return {
    id: `holiday:${input.id}`,
    kind: "holiday",
    title: input.branchName ? `${input.name} (${input.branchName})` : input.name,
    date: input.holidayDate,
    branchId: input.branchId ?? null,
    branchName: input.branchName ?? null,
    sourceId: input.id,
    sortKey: `holiday:${input.id}`,
  };
}

export function expandCompanyEventDays(input: {
  id: string;
  title: string;
  kind: string;
  startDate: string;
  endDate: string;
}): CalendarDayEvent[] {
  return expandDateRangeToDays(input.startDate, input.endDate).map((date) => ({
    id: `company:${input.id}:${date}`,
    kind: "company_event",
    title: input.title,
    date,
    companyEventKind: input.kind,
    sourceId: input.id,
    sortKey: `company:${input.id}:${date}`,
  }));
}

export function mergeEventsForDay(
  _date: string,
  events: CalendarDayEvent[],
): CalendarDayEvent[] {
  return [...events].sort((a, b) => {
    const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.title.localeCompare(b.title);
  });
}

export function calendarMonthBounds(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const gridStart = new Date(first);
  const mondayIndex = (gridStart.getDay() + 6) % 7;
  gridStart.setDate(gridStart.getDate() - mondayIndex);
  const gridEnd = new Date(last);
  const sundayIndex = (7 - gridEnd.getDay()) % 7;
  gridEnd.setDate(gridEnd.getDate() + sundayIndex);

  const weeks: string[][] = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return {
    gridStart: gridStart.toISOString().slice(0, 10),
    gridEnd: gridEnd.toISOString().slice(0, 10),
    weeks,
  };
}
```

Add to `packages/domain/src/index.ts`:

```typescript
export * from "./calendar/events";
```

- [ ] **Step 4: Run domain tests**

Run: `pnpm exec vitest run packages/domain/src/calendar/events.test.ts`
Expected: PASS

- [ ] **Step 5: Add migration**

Create `supabase/migrations/20260727200000_company_events.sql` (copy from spec §6.2).

Run: `supabase db push` (or apply locally).

- [ ] **Step 6: Add validation schema**

Create `packages/validation/src/calendar.ts`:

```typescript
import { z } from "zod";

export const companyEventKindSchema = z.enum([
  "training",
  "office_closure",
  "town_hall",
  "other",
]);

export const companyEventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120),
    description: z.string().trim().max(2000).optional().nullable(),
    kind: companyEventKindSchema,
    startDate: z.string().date(),
    endDate: z.string().date(),
    branchId: z.string().uuid().optional().nullable(),
    targetDepartmentIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endDate"],
      });
    }
  });

export type CompanyEventFormInput = z.infer<typeof companyEventFormSchema>;
```

Export from `packages/validation/src/index.ts`.

- [ ] **Step 7: Add calendar entitlement**

In `packages/platform/src/entitlements/types.ts`, add `"calendar"` to `ModuleKey` and `CORE_MODULES`.

- [ ] **Step 8: Commit**

```bash
git add packages/domain/src/calendar packages/validation/src/calendar.ts \
  supabase/migrations/20260727200000_company_events.sql \
  packages/platform/src/entitlements/types.ts
git commit -m "feat(calendar): add domain helpers, company_events migration, and validation"
```

---

### Task 2: Calendar queries (employee + manager)

**Files:**
- Create: `apps/web/src/lib/calendar/types.ts`
- Create: `apps/web/src/lib/calendar/queries.ts`
- Modify: `apps/web/src/lib/manager/calendar.ts` (deprecate or re-export from new queries)

**Interfaces:**
- Consumes: domain helpers from `@hrms/domain`
- Produces: `listEmployeeCalendarDays(input): Promise<CalendarDayEvent[]>`
- Produces: `listManagerCalendarDays(input): Promise<CalendarDayEvent[]>`
- Produces: `groupEventsByDate(events): Map<string, CalendarDayEvent[]>`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/calendar-events.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { expandLeaveRequestDays, mergeEventsForDay } from "../../packages/domain/src/calendar/events";
import { groupEventsByDate } from "../../apps/web/src/lib/calendar/queries";

describe("groupEventsByDate", () => {
  it("groups expanded leave days", () => {
    const events = expandLeaveRequestDays({
      id: "lr1",
      startDate: "2026-07-10",
      endDate: "2026-07-11",
      halfDay: false,
      status: "approved",
      leaveTypeName: "Annual Leave",
      employeeName: "Siti",
    });
    const grouped = groupEventsByDate(events);
    expect(grouped.get("2026-07-10")).toHaveLength(1);
    expect(grouped.get("2026-07-11")).toHaveLength(1);
  });
});

describe("mergeEventsForDay ordering", () => {
  it("keeps holidays first", () => {
    const leave = expandLeaveRequestDays({
      id: "lr1",
      startDate: "2026-07-01",
      endDate: "2026-07-01",
      halfDay: false,
      status: "pending",
      leaveTypeName: "MC",
      employeeName: "Ali",
    })[0]!;
    const holiday = {
      id: "h1",
      kind: "holiday" as const,
      title: "Merdeka",
      date: "2026-07-01",
      sourceId: "h1",
      sortKey: "holiday:h1",
    };
    const merged = mergeEventsForDay("2026-07-01", [leave, holiday]);
    expect(merged[0]?.kind).toBe("holiday");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm exec vitest run tests/integration/calendar-events.test.ts`

- [ ] **Step 3: Implement queries**

Create `apps/web/src/lib/calendar/types.ts` with `CalendarViewMode`, `HrCalendarFilters`, re-export `CalendarDayEvent`.

Create `apps/web/src/lib/calendar/queries.ts`:

```typescript
import {
  expandCompanyEventDays,
  expandHolidayDay,
  expandLeaveRequestDays,
  type CalendarDayEvent,
} from "@hrms/domain";
import { createClient } from "@/lib/supabase/server";

export function groupEventsByDate(events: CalendarDayEvent[]): Map<string, CalendarDayEvent[]> {
  const map = new Map<string, CalendarDayEvent[]>();
  for (const event of events) {
    const bucket = map.get(event.date) ?? [];
    bucket.push(event);
    map.set(event.date, bucket);
  }
  return map;
}

// listEmployeeCalendarDays — query leave_requests for self + holidays for branch
// listManagerCalendarDays — query reports + self; join approval_steps for pending stepId
// listHrCalendarDays — org leave with filters + holidays + company_events
```

Implementation notes for `listManagerCalendarDays`:
- Reuse `requireManagerContext()` pattern from `lib/manager/calendar.ts`
- Query `approval_steps` joined via `leave_requests.approval_request_id` where `status = 'pending'` and `approver_employee_id = managerEmployeeId`
- Map `step.id` → `approvalStepId` on expanded leave events

Leave overlap filter:

```sql
start_date <= :rangeEnd AND end_date >= :rangeStart
status IN ('pending', 'approved')
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/calendar tests/integration/calendar-events.test.ts
git commit -m "feat(calendar): add employee and manager calendar queries"
```

---

### Task 3: Shared calendar UI + employee page

**Files:**
- Create: `apps/web/src/components/calendar/calendar-shell.tsx`
- Create: `apps/web/src/components/calendar/calendar-month.tsx`
- Create: `apps/web/src/components/calendar/calendar-agenda.tsx`
- Create: `apps/web/src/components/calendar/calendar-legend.tsx`
- Create: `apps/web/src/components/calendar/calendar-event-chip.tsx`
- Create: `apps/web/src/components/calendar/calendar-toolbar.tsx`
- Create: `apps/web/src/components/calendar/calendar-day-sheet.tsx`
- Modify: `apps/web/src/app/(employee)/employee/calendar/page.tsx`

**Interfaces:**
- Consumes: `groupEventsByDate`, `calendarMonthBounds` from domain/queries
- Props: `events: CalendarDayEvent[]`, `initialYear`, `initialMonth`, `mode: "employee" | "manager" | "hr"`

- [ ] **Step 1: Build `CalendarShell`**

`calendar-shell.tsx` — client component:
- `useMediaQuery` or CSS: show `CalendarMonth` at `md+`, `CalendarAgenda` below
- Manual toggle in toolbar overrides default
- Props: `events`, `year`, `month`, `onPrevMonth`, `onNextMonth`, `onDayClick`, `onEventClick`, `weekendMode`

- [ ] **Step 2: Build `CalendarMonth`**

7-column grid using `calendarMonthBounds`. Each cell:
- Day number
- Up to 3 `CalendarEventChip` + “+N more” opens day sheet
- Weekend cells: `bg-muted/30`
- Today: ring border

- [ ] **Step 3: Build `CalendarAgenda`**

Group events by date descending within month; list chips per day.

- [ ] **Step 4: Build `CalendarDaySheet`**

Sheet/dialog listing all events for clicked day.
- Empty day (employee): link to `/employee/leave?startDate=DATE&endDate=DATE`
- Holiday: read-only detail
- Leave: link to `/employee/leave/[id]`

- [ ] **Step 5: Wire employee page**

Replace placeholder in `apps/web/src/app/(employee)/employee/calendar/page.tsx`:

```typescript
import { CalendarShell } from "@/components/calendar/calendar-shell";
import { listEmployeeCalendarDays } from "@/lib/calendar/queries";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireModule } from "@/lib/entitlements";

export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  requireModule("calendar");
  const query = await searchParams;
  const now = new Date();
  const year = Number(query.year ?? now.getFullYear());
  const month = Number(query.month ?? now.getMonth() + 1);
  const { organizationId, employeeId, session } = await requireEmployeeContext();
  // fetch employee branchId + weekend_mode from employees/branches join
  const events = await listEmployeeCalendarDays({ organizationId, employeeId, year, month });
  return (
    <div className="space-y-6">
      <PortalPageHeader description="Your leave and public holidays." title="Calendar" />
      <CalendarShell events={events} initialMonth={month} initialYear={year} mode="employee" />
    </div>
  );
}
```

- [ ] **Step 6: Manual verify**

Run dev server → `/employee/calendar` shows month grid with leave + holidays.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/calendar apps/web/src/app/(employee)/employee/calendar/page.tsx
git commit -m "feat(calendar): add shared UI and employee calendar page"
```

---

### Task 4: Manager team calendar + inline approval

**Files:**
- Modify: `apps/web/src/app/(manager)/manager/team-calendar/page.tsx`
- Create: `apps/web/src/components/calendar/calendar-event-detail-sheet.tsx`
- Reuse: `apps/web/src/components/manager/approval-actions.tsx`

**Interfaces:**
- Consumes: `listManagerCalendarDays`
- Shows `ApprovalActions` when `event.approvalStepId` is set and status is `pending`

- [ ] **Step 1: Build event detail sheet**

`calendar-event-detail-sheet.tsx`:
- Leave summary (employee, type, dates, status)
- If `approvalStepId`: render `<ApprovalActions stepId={approvalStepId} />`
- Else if approved: link to `/manager/approvals` or leave detail
- Own leave (`employeeId === managerId`): link `/employee/leave/[id]` (or manager-safe href)

- [ ] **Step 2: Replace manager page list with CalendarShell**

Update `manager/team-calendar/page.tsx` to use `listManagerCalendarDays` + `CalendarShell` with `mode="manager"`.

Keep page title “Team calendar”; description mentions direct reports + your leave.

- [ ] **Step 3: Manual verify**

Log in as manager → pending team leave chip → sheet → approve works → chip turns approved color after refresh.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(manager)/manager/team-calendar \
  apps/web/src/components/calendar/calendar-event-detail-sheet.tsx
git commit -m "feat(calendar): add manager team calendar with inline approvals"
```

---

### Task 5: HR calendar — filters, company events CRUD, all-branches holidays

**Files:**
- Create: `apps/web/src/lib/calendar/company-events.ts`
- Create: `apps/web/src/app/(hr)/hr/calendar/actions.ts`
- Create: `apps/web/src/components/calendar/calendar-filters.tsx`
- Create: `apps/web/src/components/calendar/company-event-form.tsx`
- Modify: `apps/web/src/app/(hr)/hr/calendar/page.tsx`
- Extend: `apps/web/src/lib/calendar/queries.ts` — `listHrCalendarDays`

**Interfaces:**
- Produces: `createCompanyEvent`, `updateCompanyEvent`, `deleteCompanyEvent`
- HR searchParams: `year`, `month`, `branchId`, `departmentId`, `status`, `leaveTypeId`, `q`, `allBranches`

- [ ] **Step 1: Implement HR query with filters**

`listHrCalendarDays`:
- Leave join `employees` for name search (`ilike full_name`)
- Filter `branch_id`, `department_id`, `leave_type_id`, `status[]`
- Holidays: if `allBranches=true` fetch all org holidays with branch name; else filter `branch_id`
- Company events: `expandCompanyEventDays` for all in range

- [ ] **Step 2: Build `CalendarFilters`**

HR-only filter bar:
- Branch select, department select, leave type select
- Status multi: pending / approved
- Employee search input (`q`)
- “All branches” checkbox for holidays
- Date range optional override (defaults to visible month)

Filters update URL searchParams (GET navigation).

- [ ] **Step 3: Company event CRUD**

`company-events.ts` + `hr/calendar/actions.ts`:
- `createCompanyEventAction`, `updateCompanyEventAction`, `deleteCompanyEventAction`
- Parse with `companyEventFormSchema`
- Audit via `logAuditEvent({ action: "company_event.created", ... })`
- `revalidatePath("/hr/calendar")`

`company-event-form.tsx` — Dialog with fields from spec §12.

HR toolbar: **Add event** button opens create dialog; click company event chip opens edit.

- [ ] **Step 4: Wire HR page**

Replace scaffold `hr/calendar/page.tsx` with filters + CalendarShell `mode="hr"` + company event dialogs.

Add link: “Manage holidays →” pointing to `/hr/organization/holidays`.

- [ ] **Step 5: Manual verify**

HR can create office closure spanning 3 days → appears on calendar → edit → delete.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/calendar/company-events.ts \
  apps/web/src/app/(hr)/hr/calendar \
  apps/web/src/components/calendar/calendar-filters.tsx \
  apps/web/src/components/calendar/company-event-form.tsx
git commit -m "feat(calendar): add HR calendar with filters and company events"
```

---

### Task 6: CSV export, print layout, leave prefill

**Files:**
- Create: `apps/web/src/lib/calendar/export.ts`
- Create: `apps/web/src/components/calendar/calendar-print-layout.tsx`
- Modify: `apps/web/src/components/calendar/calendar-toolbar.tsx`
- Modify: `apps/web/src/app/(employee)/employee/leave/page.tsx`
- Modify: `apps/web/src/components/employee/leave-apply-form.tsx`

**Interfaces:**
- Produces: `calendarEventsToCsv(events): string`
- Produces: `GET` handler or server action `exportHrCalendarCsv` (HR only)

- [ ] **Step 1: CSV export helper**

`export.ts`:

```typescript
export function calendarEventsToCsv(events: CalendarDayEvent[]): string {
  const header = "date,kind,title,employee_name,status,leave_type,branch,department";
  const rows = events.map((e) =>
    [e.date, e.kind, e.title, e.employeeName ?? "", e.status ?? "", e.leaveTypeName ?? "", e.branchName ?? "", ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}
```

HR toolbar **Export CSV** → server action returns CSV download (HR role check).

- [ ] **Step 2: Print layout**

`calendar-print-layout.tsx`:
- Hidden on screen (`hidden print:block`) duplicate of month + legend + filter summary
- `calendar-toolbar.tsx` **Print** button → `window.print()`
- Add `@media print` rules in component or `globals.css` scoped to `.calendar-print-root`

- [ ] **Step 3: Leave apply prefill**

Update `employee/leave/page.tsx`:

```typescript
export default async function Page({ searchParams }: { searchParams: Promise<{ startDate?: string; endDate?: string }> }) {
  const query = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const defaultStartDate = query.startDate ?? today;
  const defaultEndDate = query.endDate ?? query.startDate ?? today;
  // ...
  <LeaveApplyForm defaultStartDate={defaultStartDate} defaultEndDate={defaultEndDate} leaveTypes={leaveTypes} />
}
```

Update `LeaveApplyForm` to accept `defaultEndDate` and use for end date input `defaultValue`.

- [ ] **Step 4: Manual verify**

- Employee calendar empty day → leave form prefilled
- HR print preview shows month
- HR CSV downloads filtered rows

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/calendar/export.ts \
  apps/web/src/components/calendar/calendar-print-layout.tsx \
  apps/web/src/components/calendar/calendar-toolbar.tsx \
  apps/web/src/app/(employee)/employee/leave/page.tsx \
  apps/web/src/components/employee/leave-apply-form.tsx
git commit -m "feat(calendar): add CSV export, print layout, and leave date prefill"
```

---

### Task 7: Smoke tests, docs, spec exit criteria

**Files:**
- Modify: `scripts/smoke-test.ts`
- Modify: `docs/features.md`
- Modify: `docs/superpowers/specs/2026-07-27-calendar-module-design.md` (tick exit criteria)

- [ ] **Step 1: Extend smoke test**

Add to route checks:

```typescript
"/employee/calendar",
"/manager/team-calendar",
"/hr/calendar",
```

Add DB check:

```typescript
const { error } = await supabase.from("company_events").select("id").limit(1);
```

- [ ] **Step 2: Run full verification**

```bash
pnpm exec vitest run packages/domain/src/calendar/events.test.ts tests/integration/calendar-events.test.ts
pnpm exec tsc -p apps/web --noEmit
pnpm smoke-test --base-url http://localhost:3000
```

Expected: all pass

- [ ] **Step 3: Update docs**

`docs/features.md` §3 and §14: mark calendar routes ✅, HR org calendar ✅.

Tick spec §16 exit criteria checkboxes.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-test.ts docs/features.md docs/superpowers/specs/2026-07-27-calendar-module-design.md
git commit -m "docs(calendar): update smoke tests and feature status"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Domain expansion helpers | Task 1 |
| `company_events` migration | Task 1 |
| Employee leave + holidays | Task 2, 3 |
| Manager reports + self + approve | Task 2, 4 |
| HR filters + CSV | Task 5, 6 |
| Company events CRUD (HR only) | Task 5 |
| All-branches holiday toggle | Task 5 |
| Month desktop / list mobile | Task 3 |
| Print month view | Task 6 |
| Leave apply prefill | Task 6 |
| Entitlements `calendar` module | Task 1 |
| Tests + smoke | Task 1, 2, 7 |

## Resolved open items

1. **Company events on employee calendar:** No in v1 (decision 2A). HR-only layer.
2. **Month grid library:** Custom shadcn grid (no FullCalendar).
3. **HR pending leave approve:** Show `ApprovalActions` when `approvalStepId` exists; otherwise link to `/hr/apply-behalf/leave/[id]` or employee leave detail.

---

## Plan complete

Saved to `docs/superpowers/plans/2026-07-27-calendar-module.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach do you want?
