# Performance follow-ups (audit Task 17)

## Done in remediation follow-up

1. **Payrun detail pagination** — `getPayrunDetail(payrunId, { page, pageSize })` with URL `?page=` and `HrPagination` on HR/Director payrun pages.
2. **Analytics leave liability** — O(n) map for used days instead of nested filter per employee; headcount uses exact count.
3. **Document library truncation messaging** — banner when fetch hits the 500-row soft cap.

## Still optional later

- SQL `group by` / RPC for headcount and leave liability at Enterprise scale.
- Payrun **totals** still loads all numeric columns for sum (without employee joins); can move to SQL aggregate RPC.
- Soft-capped report export caps (`5000`) remain intentional export guards — surface “capped” messaging in report runner if needed.
