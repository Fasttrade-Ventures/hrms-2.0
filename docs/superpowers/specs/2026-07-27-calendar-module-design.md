# Calendar Module — Design Spec

**Date:** 27 Jul 2026  
**Status:** Implemented — see [implementation plan](../plans/2026-07-27-calendar-module.md)  
**Scope:** Core — full calendar module across employee, manager, and HR portals  
**Related:** [features.md](../../features.md) §3, §14 · [development-phases.md](../../development-phases.md) Phase 7

---

## 1. Summary

Build a **full Calendar module** that unifies three data sources into one visual experience:

1. **Leave** — approved and pending requests (role-scoped)
2. **Holidays** — branch-aware public/company holidays (read-only on calendar; CRUD stays under Organization → Holidays)
3. **Company events** — HR-created all-day items (training, office closure, town hall, etc.)

Each portal gets the same shared calendar UI with role-appropriate data, filters, and actions. Desktop defaults to **month grid**; mobile defaults to **list/agenda**. HR can **print or export PDF** of the visible month.

**Architecture choice:** **Read-only aggregation** for leave + holidays, plus a new `company_events` table for HR-managed events. Holiday admin remains at `/hr/organization/holidays`.

---

## 2. Product decisions (27 Jul 2026)

| # | Question | Decision |
|---|----------|----------|
| 1 | HR calendar scope (v1) | **B — Full module:** leave + holidays + HR company events |
| 2 | Employee events | **A — Leave + holidays only** |
| 3 | Manager team scope | **B — Direct reports + myself** |
| 4 | Leave statuses shown | **B — Approved + pending** |
| 5 | Default view | **C — Month on desktop, list on mobile** |
| 6 | HR filters (v1) | **C — Branch, department, leave status, leave type, date range, employee search, CSV export** |
| 7 | Holiday display | **C — HR toggle “All branches” layer; employee sees own branch** |
| 8 | Calendar actions | **C — View + HR/manager shortcuts (approve pending leave); employee quick apply leave** |
| 9 | Company events | **A — HR only** can create/edit/delete |
| 10 | Integrations (v1) | **B — Print / PDF month view** (no iCal / Google sync in v1) |

---

## 3. Goals

### Employee (`/employee/calendar`)

- Month grid (desktop) or list (mobile) showing **my leave** (approved + pending) and **branch holidays**
- Color-coded leave by status (pending = amber, approved = green) and type label (AL, MC, etc.)
- Click leave → `/employee/leave/[id]`
- Click empty day → `/employee/leave?startDate=YYYY-MM-DD` (prefill apply form)
- Click holiday → read-only popover (name, date, branch)
- No company events layer in v1 (HR-only events visible to HR calendar; optional v2: show org-wide company events to all staff)

### Manager (`/manager/team-calendar`)

- Same responsive views as employee
- Shows **direct reports’ leave** (approved + pending) **plus manager’s own leave**
- Holidays for manager’s branch (toggle to show org holidays if same branch list applies)
- Click team leave → detail sheet with link to approval if pending and `stepId` available
- **Approve / reject pending leave** inline via existing `approveRequest` / `rejectRequest` actions (reuse `ApprovalActions` pattern)
- Click own leave → `/employee/leave/[id]` or manager-equivalent detail

### HR Administrator (`/hr/calendar`)

- Org-wide leave calendar with full filter bar
- **Company events** CRUD (create, edit, delete) on same page — side panel or dialog
- Holiday layer with **“All branches” toggle** — when on, show holidays for every branch with branch label/color; when off, filter to selected branch
- Filters: branch, department, leave status, leave type, custom date range, employee name search
- **CSV export** of visible events in current range (leave rows + company events; holidays as separate rows)
- **Print / PDF** of current month view (browser print stylesheet + optional server PDF via existing `styled-pdf` helper)
- Click leave → employee profile or leave detail; pending leave → approve/reject if HR has approval rights (or link to apply-behalf detail)
- Holiday CRUD **not** duplicated here — link to `/hr/organization/holidays`

---

## 4. Non-goals (v1)

- iCal export, Google Calendar / Outlook sync
- Manager-created company events
- Announcements on calendar
- Attendance sessions, OT, late reports, manual attendance on calendar
- Shift rosters / work schedules on calendar (Pro)
- Blackout periods (Pro)
- Editing leave dates by drag-and-drop on calendar
- Email reminders for company events
- Recurring company events (single-date or date-range only in v1)

### v2 candidates

- Show org-wide **company events** on employee/manager calendars (read-only)
- Coverage warning (“3+ people off same day”)
- Recurring company events
- iCal feed

---

## 5. Current state

| Area | Status |
|------|--------|
| `/employee/calendar` | ✅ Month/list, leave + holidays |
| `/manager/team-calendar` | ✅ Team + self leave, inline approve |
| `/hr/calendar` | ✅ Filters, company events, CSV, print |
| `holidays` table + HR CRUD | ✅ `/hr/organization/holidays` |
| `leave_requests` + approvals | ✅ Employee apply, manager/HR approve |
| `company_events` table | ✅ Migrated |
| Shared calendar UI | ✅ `components/calendar/*` |
| Print / CSV | ✅ Browser print + HR CSV export |

---

## 6. Data model

### 6.1 Existing tables (read-only on calendar)

**`leave_requests`** — already has `start_date`, `end_date`, `half_day`, `status`, `employee_id`, `leave_type_id`.

**`holidays`** — `holiday_date`, `branch_id` (null = org-wide / all branches per existing org rules).

### 6.2 New table — `company_events`

```sql
-- 20260727200000_company_events.sql

create type public.company_event_kind as enum (
  'training',
  'office_closure',
  'town_hall',
  'other'
);

create table public.company_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  kind public.company_event_kind not null default 'other',
  start_date date not null,
  end_date date not null,
  branch_id uuid references public.branches(id) on delete cascade,
  target_department_ids uuid[] not null default '{}',
  all_day boolean not null default true,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_events_date_order check (end_date >= start_date)
);

create index company_events_org_dates_idx
  on public.company_events (organization_id, start_date, end_date);

alter table public.company_events enable row level security;

create policy company_events_org on public.company_events
  for all using (organization_id in (select public.current_user_org_ids()));
```

| Column | Notes |
|--------|-------|
| `branch_id` | Null = all branches |
| `target_department_ids` | Empty = all departments; same semantics as announcements |
| `all_day` | v1 always `true`; column reserved for timed events later |
| `kind` | Drives color in legend |

**Audience for company events (HR calendar v1):** HR sees all. Employee/manager calendars do **not** show company events in v1 (decision 2A). Schema supports v2 fan-out.

### 6.3 Normalized calendar event (application layer)

```ts
type CalendarEventKind = "leave" | "holiday" | "company_event";

type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  allDay: true;
  status?: "pending" | "approved";
  leaveTypeName?: string;
  employeeId?: string;
  employeeName?: string;
  branchId?: string | null;
  branchName?: string | null;
  departmentId?: string | null;
  companyEventKind?: string;
  href?: string;
  approvalStepId?: string | null; // for inline manager approve
};
```

**Leave expansion:** Multi-day leave spans each calendar day (inclusive `start_date`…`end_date`). Half-day shown with “½” suffix on that day only.

**Holiday expansion:** Single-day events from `holiday_date`.

**Company event expansion:** Same inclusive date range as leave.

---

## 7. Domain logic (`packages/domain/src/calendar/`)

| Function | Purpose |
|----------|---------|
| `expandDateRangeToDays(start, end)` | Inclusive day list |
| `expandLeaveToEvents(leave, employee)` | One row per day per leave request |
| `expandHolidayToEvent(holiday)` | Single-day holiday event |
| `expandCompanyEventToEvents(event)` | Date range expansion |
| `mergeEventsForDay(date, layers)` | Sort: holidays → company → leave |
| `calendarMonthBounds(year, month)` | First/last cell for grid (Mon–Sun week start) |

Weekend shading uses employee/manager **branch `weekend_mode`** (`sat_sun` | `fri_sat` | `sun_only`) from existing branch data.

---

## 8. Routes & information architecture

```text
Employee
└── /employee/calendar                    Month (desktop) / list (mobile)

Manager
└── /manager/team-calendar                Same UI; team + self leave

HR Administrator
└── /hr/calendar                          Full org calendar + company event CRUD
    └── ?year=&month=&branchId=&departmentId=&status=&leaveTypeId=&q=&allBranches=

Organization (unchanged)
└── /hr/organization/holidays             Holiday CRUD — calendar links here
```

**Nav:** Existing entries in `portal-nav.ts` — no new routes.

**API / actions:**

```text
apps/web/src/app/(hr)/hr/calendar/actions.ts     create/update/delete company event
apps/web/src/lib/calendar/queries.ts             employee | manager | hr fetchers
apps/web/src/lib/calendar/export.ts              CSV + print payload
```

---

## 9. UI components

### 9.1 Shared (`apps/web/src/components/calendar/`)

| Component | Responsibility |
|-----------|----------------|
| `calendar-shell.tsx` | Responsive wrapper: `CalendarMonth` vs `CalendarAgenda` via breakpoint |
| `calendar-month.tsx` | 7-column grid, day cells, event chips (max 3 + “+N more”) |
| `calendar-agenda.tsx` | Chronological list grouped by day |
| `calendar-legend.tsx` | Leave pending/approved, holiday, company event kinds |
| `calendar-event-chip.tsx` | Color + label by `kind` / `status` |
| `calendar-day-detail-sheet.tsx` | Click day → all events that day + actions |
| `calendar-event-detail-sheet.tsx` | Single event detail + approve / view links |
| `calendar-filters.tsx` | HR filter bar (branch, dept, status, type, range, search) |
| `calendar-toolbar.tsx` | Prev/next month, today, view toggle, print, export CSV |
| `company-event-form.tsx` | HR create/edit dialog |
| `calendar-print-layout.tsx` | Print-only CSS (`@media print`) |

### 9.2 Responsive default (decision 5C)

- `md` and up → month grid
- Below `md` → agenda list
- User may manually toggle view; preference stored in `localStorage` optional (nice-to-have)

### 9.3 Color system

| Layer | Color |
|-------|-------|
| Leave approved | Green (`--success` / emerald) |
| Leave pending | Amber (`--warning`) |
| Holiday | Blue muted |
| Company training | Purple |
| Office closure | Red muted |
| Town hall | Indigo |
| Other event | Gray |

### 9.4 Print / PDF (decision 10B)

- **Print:** `window.print()` on a dedicated print layout (month grid + legend + filter summary footer)
- **PDF:** Server route `GET /api/calendar/export.pdf?...` using existing PDF styling utilities, or client print-to-PDF via browser (prefer print CSS first; PDF route if print insufficient)

### 9.5 CSV export (decision 6C)

Columns: `date`, `kind`, `title`, `employee_name`, `status`, `leave_type`, `branch`, `department`

Export respects active HR filters and visible month/range.

---

## 10. Queries & scoping

### 10.1 Employee

```ts
listEmployeeCalendarEvents({
  organizationId,
  employeeId,
  branchId,
  rangeStart,
  rangeEnd,
})
```

- Leave: `employee_id = self`, `status IN ('pending', 'approved')`, overlapping range
- Holidays: `branch_id IS NULL OR branch_id = employee.branch_id`

### 10.2 Manager

```ts
listManagerCalendarEvents({
  organizationId,
  managerEmployeeId,
  reportIds, // direct reports
  branchId,
  rangeStart,
  rangeEnd,
})
```

- Leave: `employee_id IN (reportIds + managerEmployeeId)`, same statuses
- Join `approval_steps` for pending rows where manager is assignee → surface `approvalStepId`
- Holidays: manager’s branch

### 10.3 HR

```ts
listHrCalendarEvents({
  organizationId,
  filters: { branchId, departmentId, statuses, leaveTypeId, employeeQuery, rangeStart, rangeEnd, allBranches },
})
```

- Leave: org-wide with filters
- Holidays: all branches if `allBranches`, else selected branch
- Company events: all in range (HR-only layer)

---

## 11. Actions from calendar (decision 8C)

| Actor | Action | Behavior |
|-------|--------|----------|
| Employee | Click leave | Navigate to leave detail |
| Employee | Click empty day | `/employee/leave?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` |
| Employee | Click holiday | Popover with name + date |
| Manager | Click pending team leave | Sheet with summary + **Approve / Reject** (`ApprovalActions`) |
| Manager | Click approved leave | Link to leave/approval detail |
| HR | Click leave | Link to employee profile or leave record |
| HR | Click pending leave | Approve/reject if step assigned to HR, else link to approvals |
| HR | Click company event | Edit dialog |
| HR | “Add event” | Create company event dialog |
| All | Print | Open print layout for current month |

**Leave apply prefill:** Extend employee leave apply page to read `startDate` / `endDate` search params and set form defaults.

---

## 12. Company event CRUD (HR only)

Form fields:

| Field | Control |
|-------|---------|
| Title | Text, required, max 120 |
| Kind | Select: training, office closure, town hall, other |
| Start date | Date, required |
| End date | Date, required, ≥ start |
| Branch | Optional select; empty = all branches |
| Departments | Multi-select; empty = all |
| Description | Optional textarea |

Validation: `packages/validation/src/calendar.ts` — `companyEventFormSchema`.

Audit: log `company_event.created` / `updated` / `deleted` via existing audit helper.

---

## 13. Entitlements & security

- Module flag: `calendar` (add to entitlements if not present; default **on** for Core)
- RLS on `company_events` — org-scoped
- Leave/holiday data fetched with existing Supabase client + server-side scope checks (never trust client filters alone)
- Manager approve actions reuse existing `approveRequest` authorization (step assignee check)
- CSV/PDF export: HR administrator role only

---

## 14. Testing

| Test | Type |
|------|------|
| `expandLeaveToEvents` multi-day + half-day | Unit (`packages/domain`) |
| `mergeEventsForDay` ordering | Unit |
| Employee scope: only own leave | Integration |
| Manager scope: reports + self | Integration |
| HR filters narrow leave set | Integration |
| `companyEventFormSchema` validation | Unit |

Smoke test: add route checks for `/employee/calendar`, `/manager/team-calendar`, `/hr/calendar`.

---

## 15. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **1** | Domain helpers + `CalendarEvent` types + migration `company_events` |
| **2** | Shared `CalendarMonth` / `CalendarAgenda` + employee page |
| **3** | Manager page (team + self, approval sheet) |
| **4** | HR page (filters, all-branches holiday toggle, company event CRUD) |
| **5** | CSV export + print layout + leave apply date prefill |
| **6** | Tests + smoke + `features.md` status update |

---

## 16. Exit criteria

- [x] Employee sees own approved + pending leave and branch holidays (month desktop / list mobile)
- [x] Manager sees direct reports + own leave with approve/reject on pending items
- [x] HR sees org leave with full filter bar + employee search + CSV export
- [x] HR can create/edit/delete company events on `/hr/calendar`
- [x] HR can toggle “All branches” holiday layer
- [x] Click empty day prefills employee leave apply form
- [x] Print month view works (browser print)
- [x] Holiday admin remains only under Organization → Holidays
- [x] `pnpm typecheck` passes
- [x] Domain + integration tests pass

---

## 17. Resolved items

1. Company events on employee calendar: **no** in v1 (decision 2A); v2 candidate.
2. Month grid: **custom shadcn grid** (no FullCalendar).
3. HR pending leave approve: **inline approve/reject** when HR user has an employee record and is the approval step assignee; otherwise link to apply-behalf leave detail.
