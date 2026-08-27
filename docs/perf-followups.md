# Performance follow-ups (audit Task 17)

## Done

1. **Payrun detail pagination** — `getPayrunDetail(payrunId, { page, pageSize })` with URL `?page=` and `HrPagination` on HR/Director payrun pages.
2. **Analytics leave liability** — O(n) map for used days instead of nested filter per employee; headcount uses exact count.
3. **Document library truncation messaging** — banner when fetch hits the 500-row soft cap.
4. **Payrun totals RPC** — `payrun_item_totals(org_id, payrun_id)` in migration `20260827120000_membership_branches_and_payrun_totals.sql`; `getPayrunDetail` uses SQL aggregates instead of loading all numeric columns.
5. **Report export soft-cap UX** — report runner shows a banner when total exceeds the 5000-row export guard.

## Still optional later

- SQL `group by` / RPC for headcount and leave liability at Enterprise scale.
