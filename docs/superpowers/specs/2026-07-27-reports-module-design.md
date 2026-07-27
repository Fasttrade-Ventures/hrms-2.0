# Reports Module — Design Spec

**Date:** 27 Jul 2026  
**Status:** Implemented — see [implementation plan](../plans/2026-07-27-reports-module.md)  
**Scope:** Core — HR reports hub with Director read-only access and auditor permission  
**Related:** [features.md](../../features.md) §14 · [development-phases.md](../../development-phases.md) Phase 8

---

## 1. Summary

Replace the scaffold **Reports** page with a full **HR reports hub** that centralizes org-wide operational reporting: leave balances, attendance, headcount, document compliance, assets, claims/OT, and performance snapshots.

Each report is a **filterable table** with **CSV download** and **browser print/PDF** (reuse calendar print pattern). The hub also surfaces **export shortcuts** to existing module exports (calendar CSV, documents compliance, asset register).

**Access model (v1):**

| Audience | Access |
|----------|--------|
| **HR Administrator** | Full hub — run all reports, export, print |
| **Director** | Read-only org reports at `/director/reports` (same report views, no HR-only actions) |
| **Auditor** (specialist permission) | Read-only access to HR reports hub (view + export; audit logged) |
| **Manager** | No new reports hub — continue using existing team pages (`/manager/team-attendance`, `/manager/team-leave`, etc.) |
| **Employee** | No access |

**Architecture choice:** **Read-only query layer** in `apps/web/src/lib/reports/` — no new tables. Reuse existing domain queries where possible; add org-scoped report aggregations. Export actions call `logAuditEvent`. Payroll **statutory** reports stay under `/hr/payroll`; hub links there only.

---

## 2. Product decisions (27 Jul 2026)

| # | Question | Decision |
|---|----------|----------|
| 1 | Who gets Reports v1 | **D — HR hub**; managers keep team pages **+ Director** read-only org reports |
| 2 | Report types v1 | **D — Full hub:** Leave, Attendance, Headcount, Document compliance, Asset register, Claims/OT, Performance snapshot |
| 3 | Output formats | **C — Table + CSV + browser print/PDF** |
| 4 | Standard filters | **D — Date range + branch + dept + employment status + employee search + presets** (“This month”, “YTD”, etc.) |
| 5 | Leave report | **D — Summary by employee** with balance/entitlement remaining per leave type |
| 6 | Attendance report | **C — Both** daily attendance log **and** per-employee summary (two separate reports) |
| 7 | Payroll relationship | **B — Separate**; Reports hub links to Payroll for statutory exports only |
| 8 | Existing exports | **C — Hub lists** all export actions (calendar, documents, assets) as shortcuts |
| 9 | Scheduled reports | **A — Out of v1** entirely |
| 10 | Access & audit | **C — Audit log on export** + `auditor` specialist permission read-only access |

---

## 3. Goals

### HR Administrator (`/hr/reports`)

**Hub page** — card grid (Documents hub pattern) with two sections:

1. **Operational reports** — links to each report runner below  
2. **Quick exports** — shortcuts to module-native exports without duplicating logic:
   - **Calendar events CSV** → `/hr/calendar` with export action (existing `calendarEventsToCsv`)
   - **Document compliance matrix** → `/hr/documents/compliance` (add CSV export if missing)
   - **Asset register CSV** → new export on `/hr/assets` or inline from reports hub via shared `assetsToCsv`

**Payroll statutory** — informational card linking to `/hr/payroll` (“Statutory pay-run exports live in Payroll”).

### Director (`/director/reports`)

- Same hub layout and report runners as HR, **read-only** (no apply-behalf, no edit links into HR mutation flows except employee profile view links where appropriate)
- Nav: add **Reports** to director portal nav (alongside dashboard)
- Route prefix: `/director/reports` and `/director/reports/[reportSlug]`
- Reuse shared report components; `portal` prop controls action visibility

### Auditor permission

- Users with `auditor` in `organization_memberships.permissions` may access `/hr/reports/*` **without** `hr_administrator` role
- Implement `requireReportsAccess()` guard:
  - Allow if `hr_administrator` **or** `director` (on director routes) **or** `permissions` includes `auditor`
- Extend `loadMembership` / `UserMembership` to include `permissions: string[]`
- Auditors: view tables, CSV, print — same as Director on HR routes; **no** create/update/delete anywhere

### Report catalog (v1)

| Slug | Title | Description |
|------|-------|-------------|
| `leave-balances` | Leave balances | Per employee × leave type: entitlement, used, pending, remaining (as-of report date / current cycle) |
| `leave-usage` | Leave usage | Approved/pending leave requests in date range (transactional detail) |
| `attendance-daily` | Attendance daily log | One row per employee per work date per session: clock in/out, status, branch, department |
| `attendance-summary` | Attendance summary | Per employee in range: days present, absent, late, total hours (derived from `attendance_records`) |
| `headcount` | Headcount | Active/inactive counts with breakdown by branch, department, employment type; optional employee listing |
| `document-compliance` | Document compliance | Employee × required document status (reuse compliance matrix query; flat/long export format for CSV) |
| `asset-register` | Asset register | Full register snapshot: asset, category, serial, status, assignee, branch, value, warranty |
| `claims-ot` | Claims & overtime | Combined summary: claims and OT requests in date range with status, amount/hours, employee |
| `performance-snapshot` | Performance snapshot | Current-cycle appraisals: employee, cycle, status, self/manager ratings |

### Shared filter bar (all reports except where noted)

Reusable `ReportFilterBar` component:

| Filter | Applies to |
|--------|------------|
| **Date preset** | This month, Last month, This quarter, YTD, Custom |
| **Date from / to** | Reports with temporal scope (leave usage, attendance, claims/OT) |
| **Branch** | All reports with employee dimension |
| **Department** | All reports with employee dimension |
| **Employment status** | active, inactive, on_leave, all |
| **Employee search** | Name or employee number (debounced) |

**Report-specific notes:**

- **Leave balances** — as-of date (default today); no “from/to” range required  
- **Headcount** — snapshot date; breakdown dimensions as table columns  
- **Document compliance** — no date range (current compliance state); optional “as of” label = today  
- **Asset register** — optional status/category filters in addition to shared employee/org filters  
- **Performance snapshot** — optional review cycle filter; default = active/open cycles

Filters persist in URL search params (`?from=…&to=…&branch=…`) for shareable links.

### Output actions (every report page)

1. **On-screen table** — paginated (50 rows/page), sortable columns where cheap  
2. **Download CSV** — server action or route handler returning `text/csv` attachment; filename includes report slug + date  
3. **Print / PDF** — `window.print()` + `print:hidden` chrome + `ReportPrintLayout` (mirror `CalendarPrintLayout`)

All **CSV and print** actions log audit:

```ts
logAuditEvent({
  action: "report.exported",
  resourceType: "report",
  resourceId: reportSlug,
  metadata: { format: "csv" | "print", filters },
});
```

---

## 4. Non-goals (v1)

- Scheduled / email reports (Pro)
- HQ / branch analytics dashboards (Enterprise `analytics` module)
- Payroll statutory file generation inside Reports (link to Payroll only)
- Manager reports hub (managers use existing team pages)
- Branch Admin reports portal
- Custom report builder / saved filter presets per user
- Excel (.xlsx) export
- Row-level security beyond org scope (Director sees full org, not branch-scoped)
- Real-time refresh / subscriptions

### v2 candidates

- Saved report presets per user
- Branch Admin scoped reports
- Manager org-wide read-only slice
- Email scheduled exports (Pro)
- Enterprise analytics widgets embedded in hub
- Excel export
- Claims/OT split into separate report pages
- Attendance: include manual attendance / late request columns

---

## 5. Data layer

### 5.1 New lib (`apps/web/src/lib/reports/`)

| Module | Responsibility |
|--------|----------------|
| `access.ts` | `requireReportsAccess()`, `canAccessReports(session)` |
| `types.ts` | Shared filter types, report row types, slug union |
| `filters.ts` | Parse URL params → `ReportFilters`; preset date ranges |
| `leave-balances.ts` | Org-wide leave balance aggregation (extend logic from `employee/leave.ts`) |
| `leave-usage.ts` | `leave_requests` in range with employee dimensions |
| `attendance-daily.ts` | `attendance_records` joined to employees |
| `attendance-summary.ts` | Aggregate per employee over range |
| `headcount.ts` | Counts + optional employee list from `employees` |
| `document-compliance.ts` | Thin wrapper → `getComplianceMatrix` from `hr/documents.ts` |
| `asset-register.ts` | Thin wrapper → `listAssets` from `assets/queries.ts` |
| `claims-ot.ts` | Union/query `claims` + `overtime_requests` |
| `performance-snapshot.ts` | `performance_appraisals` + `review_cycles` |
| `export.ts` | Generic `rowsToCsv`, per-report column mappers |
| `audit.ts` | `logReportExport(slug, format, filters)` |

### 5.2 Query patterns

**Leave balances** — for each active employee (per filters):

1. Load org `leave_types`  
2. Sum approved `leave_requests.days` by type (YTD or cycle — v1: calendar year)  
3. Sum pending days by type  
4. `remaining = entitlement - used - pending` (skip or N/A for unpaid types)

Reuse `countWorkingDays` only for display consistency; stored `days` on requests is source of truth.

**Attendance daily** — `attendance_records` where `work_date` between from/to; join employee, branch, department.

**Attendance summary** — group daily rows: count sessions with `clock_in_at`, flag `status` values (present/late/absent per existing status enum/text).

**Headcount** — aggregate `employees` by `status`, `branch_id`, `department_id`; secondary table listing employees when “show detail” toggle on.

**Claims & OT** — two queries merged in UI (tabs or single table with `kind` column):

- Claims: amount, category, claim date, status  
- OT: hours, rate type, work date, status

**Performance snapshot** — latest appraisal per employee for selected cycle (or all open cycles).

### 5.3 Performance

- Server Components fetch report data; cap unfiltered exports at **5,000 rows** with warning banner  
- Paginate UI at 50 rows  
- Indexes already exist on `organization_id`, `employee_id`, `work_date` — no migration required for v1

---

## 6. Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/hr/reports` | HR, Auditor | Hub |
| `/hr/reports/[slug]` | HR, Auditor | Report runner |
| `/director/reports` | Director | Hub (read-only) |
| `/director/reports/[slug]` | Director | Report runner (read-only) |
| `/api/reports/[slug]/csv` | HR, Director, Auditor | Optional CSV download route (if not using server action) |

Update `PORTAL_PREFIXES` / `canAccessPortal` — auditor does **not** get full `/hr/*`; only reports paths whitelisted via layout guard.

**Auth layout strategy:**

- `apps/web/src/app/(hr)/hr/reports/layout.tsx` — `requireReportsAccess()` allowing `hr_administrator` or `auditor`  
- `apps/web/src/app/(director)/director/reports/` — `requireRole("director")`  
- Middleware: auditors attempting other `/hr/*` routes still redirect to `/unauthorized` unless they also hold `hr_administrator`

---

## 7. UI notes

- Hub: reuse `DocumentsHub` card grid pattern (`ListCard`, section headings)  
- Report pages: `PortalSectionCard` with title, description, `ReportFilterBar`, action row (CSV, Print)  
- Table: shadcn `Table` or existing HR table patterns  
- Empty states: `EmptyState` with filter reset CTA  
- Print layout: org name + report title + filter summary + generated timestamp in header  
- Director portal nav: add Reports item with `reports` icon  
- Mobile: filters collapse into sheet; table horizontal scroll

---

## 8. Module export shortcuts (hub section)

| Shortcut | Target | Export mechanism |
|----------|--------|------------------|
| Calendar CSV | `/hr/calendar` | Existing export button on HR calendar |
| Compliance CSV | `/hr/documents/compliance` | **Add** `complianceMatrixToCsv` + download button on compliance page |
| Asset register CSV | `/hr/assets` | **Add** `assetsToCsv` + download on register toolbar **or** hub triggers same shared function |

Reports hub cards deep-link to the module page **or** run export directly via shared lib (prefer shared lib + audit log from hub if one-click).

---

## 9. Payroll boundary

- Reports hub shows a **Payroll & statutory** card:
  - Copy: “EPF, SOCSO, PCB, and pay-run exports are generated from Payroll.”
  - CTA: “Go to Payroll” → `/hr/payroll`
- No duplication of pay-run CSV/statutory logic in Reports v1

---

## 10. Testing

| Layer | Coverage |
|-------|----------|
| `packages/domain/src/reports/*.test.ts` | Date preset helpers, CSV escaping (if moved to domain) |
| `apps/web/src/lib/reports/*.test.ts` | Filter parsing, leave balance math, attendance aggregation |
| `tests/integration/reports.test.ts` | `requireReportsAccess` matrix (HR, director, auditor, manager denied) |
| Smoke test | `/hr/reports`, `/director/reports` auth guards |
| Manual QA | Each report with filters; CSV opens in Excel; print layout; audit row on export |

---

## 11. Documentation updates

- `docs/features.md` §14 — mark HR reports hub ✅  
- `docs/features.md` §15 — Director portal: Reports ✅  
- `docs/ui-design-inventory.md` — reports hub, filter bar, print layout  
- Seed script: optional `auditor` permission on a demo account for QA

---

## 12. Resolved items

1. **Managers:** no reports hub; team pages remain their reporting surface.  
2. **Director:** full org read-only reports, separate portal routes.  
3. **Payroll:** statutory exports stay in Payroll; hub links only.  
4. **Scheduled email:** out of v1.  
5. **Enterprise analytics:** out of v1 (separate entitlement).  
6. **Auditor:** specialist permission on membership, not a system role.  
7. **Attendance:** two distinct reports (daily log + summary), not a single combined view.

---

## 13. Exit criteria

- [x] `/hr/reports` hub with report cards + quick export shortcuts
- [x] All nine report runners with shared filter bar (where applicable)
- [x] CSV download + print/PDF on every report
- [x] `report.exported` audit events on CSV and print
- [x] `/director/reports` read-only mirror
- [x] `auditor` permission grants read/export access to HR reports
- [x] Compliance matrix CSV + asset register CSV (module or shared lib)
- [x] Payroll statutory link card on hub
- [x] `pnpm typecheck` passes
- [x] Integration/smoke tests pass
- [x] `docs/features.md` updated
