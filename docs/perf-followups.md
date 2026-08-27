# Performance follow-ups (audit Task 17)

Partial remediation shipped with authz/correctness work. Remaining hotspots:

1. **`apps/web/src/lib/analytics/queries.ts`**
   - `getHeadcountMetrics` / `getLeaveLiabilityMetrics` still aggregate in memory over all active employees and leave requests.
   - Prefer SQL `group by` / RPC or materialized summary tables for Enterprise orgs.

2. **`apps/web/src/lib/payroll/queries.ts` → `getPayrunDetail`**
   - Loads all payrun lines + BASIC components in one shot.
   - Add URL pagination (`?page=&pageSize=50`) and page the lines table UI.

3. **Soft-capped directories** (employees, documents, approvals)
   - Replace silent `.limit(500|5000)` with real pagination and “Showing first N of M” banners.

Track against production slowness on `hrms.asyrafdigital.com` after PR-A–E land.
