# Analytics cockpit + Developer API partner tabs — design

**Date:** 2026-11-11  
**Status:** Approved  
**Routes:** `/hr/analytics` (also director/owner analytics via shared dashboard) · `/hr/integrations/api`

## Goals

1. Turn the thin Analytics page (stat cards + lists) into a **full HR analytics cockpit** with multiple chart types.
2. Support **period + branch + department filters** and **click-to-detail** via an **inline drawer** (no new detail routes in v1).
3. Restructure **Developer API** so partner connections (BukuCloud, Virtual Hirix, …) live as **tabs** under that page; remove the separate BukuCloud sidebar item.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Scope domains | Full cockpit: workforce + leave + payroll + recruitment |
| Interactivity | Filters + click chart → detail |
| Detail UX | Inline drawer/panel with sortable table |
| Implementation approach | Extend current dashboard; add **Recharts** |
| Partner nav | BukuCloud (and peers) as tabs inside Developer API |

## Analytics — layout

### Filters (URL search params)

- `period`: `month` | `6m` | `ytd` (default `6m`)
- `branchId` (optional)
- `departmentId` (optional)

All KPIs and charts respect these filters. Refresh preserves state via the URL.

### KPI row (6 cards)

1. Active headcount  
2. Joiners (period)  
3. Leavers (period)  
4. Leave liability (est.)  
5. Last payrun net  
6. Open requisitions / active candidates (hidden if recruitment module off)

### Charts

| Domain | Widget | Type |
|---|---|---|
| Workforce | Headcount by branch | Vertical bar |
| Workforce | Headcount by department | Donut |
| Workforce | Joiners vs leavers over time | Dual line |
| Leave | Days taken by month | Bar |
| Leave | Remaining liability by department | Horizontal bar |
| Payroll | Gross / net by month | Dual line |
| Payroll | Last payrun composition (if available) | Stacked bar |
| Recruitment | Pipeline by stage | Funnel or horizontal bar |
| Recruitment | Open roles vs active candidates | Bar |

Empty / sparse: keep chart chrome + “Not enough data in this period”.

### Click → drawer

- Click a bar/segment/point opens a right-side **Sheet/drawer**.
- Title = chart + segment label; body = table of underlying rows (employees, leave rows, pay lines, or candidates) with count.
- Filters remain applied; closing the drawer keeps the dashboard scroll position.

### Data strategy

Reuse and extend [`apps/web/src/lib/analytics/queries.ts`](../../apps/web/src/lib/analytics/queries.ts).

- Prefer existing org-scoped tables (`employees`, `leave_requests`, payruns, `job_requisitions` / `job_applications`).
- No analytics warehouse in v1. Trends derived from available fields (e.g. join/created dates, locked payrun months, leave request dates, application stages).
- Shared `AnalyticsDashboard` continues to serve HR, director, and owner analytics pages.

### Out of scope (analytics v1)

- Saved views, CSV export, scheduled digests  
- Dedicated detail URLs  
- Attendance heatmaps  
- Custom BI layouts  

## Developer API — partner tabs

### Problem

Sidebar under Integrations lists **Developer API** and **BukuCloud** separately. Partner products (BukuCloud, Virtual Hirix, future connectors) are better grouped with API access.

### Design

1. **Sidebar:** under Integrations children, keep **Webhooks** + **Developer API**; **remove** the top-level **BukuCloud** nav item.  
2. **`/hr/integrations/api`:** tabbed page:
   - **API keys** — existing `ApiKeysPanel` (default tab)
   - **BukuCloud** — embed existing BukuCloud settings (same content as today’s `/hr/integrations/bukucloud`)
   - **Virtual Hirix** — partner tab for Virtual Hirix connection/docs (v1: setup/copy guidance + link to API keys usage; full sync settings only if already available—none in codebase today → ship as guided partner tab, not a fake backend)
   - Future partners append as additional tabs without new sidebar entries
3. **URLs:** prefer query tab `?tab=api|bukucloud|virtual-hirix` on `/hr/integrations/api`. Keep `/hr/integrations/bukucloud` as a **redirect** to `?tab=bukucloud` so old links (e.g. payrun panel) still work.
4. **Integrations hub cards:** BukuCloud can remain a card that deep-links to the BukuCloud tab; Virtual Hirix card optional once messaging is ready.

### Entitlements

Unchanged: API module for keys; integrations + payroll for BukuCloud settings visibility inside its tab.

## Testing / success

- [x] Analytics shows KPIs + at least one chart per domain when data exists  
- [x] Period / branch / department filters update charts  
- [x] Chart click opens drawer with matching rows  
- [x] Recruitment widgets absent when module disabled  
- [x] Developer API tabs switch without losing page chrome  
- [x] BukuCloud sidebar entry gone; old `/hr/integrations/bukucloud` redirects to API tab  
- [x] Virtual Hirix tab visible and actionable (docs/API path) without inventing a sync backend  

## Self-review

- No placeholders left for chart list or filter params.  
- Virtual Hirix explicitly scoped as partner tab without inventing nonexistent sync APIs.  
- Analytics and Integrations are one release package but independently shippable if needed; default is same PR stream after plan approval.
