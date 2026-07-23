# Migration acceptance criteria

Cutover is blocked until all thresholds pass on a production-like dry run.

## Row counts

| Domain | Criterion |
|--------|-----------|
| Employees | `legacy.users` active count = `employees` where `status = active` ± documented exclusions (test accounts) |
| Leave requests | 1:1 by legacy ID mapping table |
| Attendance rows | 1:1 per employee per day/session |
| Claims / OT / late / manual | 1:1 with status preserved |
| Payruns (locked) | 1:1 header + items + components |
| Documents metadata | 1:1 rows; files reconciled separately |
| Announcements | 1:1 active + archived |

## Relationships

- Every `employee` has valid `organization_id`, `branch_id` (if set), `department_id` (if set)
- Every `organization_membership` links valid `auth.users` ↔ `employees` (when activated)
- Manager scope: every report has valid `manager_employee_id` or explicit orphan report
- No cross-organization FK references

## Monetary totals (payroll)

| Check | Tolerance |
|-------|-----------|
| Per locked payrun: sum(gross) | Exact match (decimal) |
| Per locked payrun: sum(net) | Exact match |
| Per employee YTD EPF/SOCSO/EIS/PCB | Exact match per payrun item |
| Organization annual statutory totals | Exact match aggregated |

Use `packages/testkit/fixtures/payroll-golden-cases.json` for representative months; full historical reconciliation required for cutover window (agreed audit period).

## Files (R2)

| Check | Criterion |
|-------|-----------|
| Count | Legacy upload count = R2 object count ± documented skips |
| Hash | SHA-256 match per migrated file |
| Authorization | Spot-check: employee cannot read another employee's document |
| Orphans | Zero DB rows pointing to missing objects; orphan cleanup report empty |

## Audit & history

- Payrun status log events preserved with actor + timestamp
- Approval timestamps and actor IDs preserved on all request types

## Payroll golden gate

- All cases in `payroll-golden-cases.json` pass with calculator version pinned
- LHDN 2026 testing questions (when added) pass before MTD release claim
- Reference mismatch vs official schedule blocks payroll release until reviewed

## Sign-off checklist

- [ ] Row-count report signed by HR
- [ ] Payroll reconciliation signed by payroll processor
- [ ] File hash report archived
- [ ] Role-based UAT (legacy QA guide + Playwright) green
- [ ] Rollback rehearsal completed
- [ ] Maintenance window + final snapshot documented
