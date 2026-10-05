# Job: Employee Core gaps

**Status:** ✅ Shipped on `main` (PRs #25–#30, 2026-09-17)  
**Role:** Employee portal only  
**Ref:** `docs/features.md` §23A items 2–5

## Do

1. [x] Leave cancel (pending) and revoke (approved) on `/employee/leave/[id]`
2. [x] Replacement credit consume-once, linked to replacement leave; restore credit if leave is cancelled/revoked
3. [x] Clock Late from the employee’s shift + `grace_minutes` (roster today, else `employees.shift_id`). Remove hardcoded 09:00
4. [x] Overnight shifts: clock-out after midnight stays on the same work date
5. [x] Auto clock-out after shift end
6. [x] Tardiness alert if not clocked in after start + grace

## Don’t

- Other roles (Manager, HR, Branch Admin, Owner)
- BM/EN, PWA, selfie, WhatsApp, native apps
- Multi-level approvals, leave accrual jobs, positions catalog

## Done when

- [x] All 6 items work on the Employee portal
- [x] Domain + integration tests cover the new behaviour (`tests/unit/leave-cancel-revoke.test.ts`, `tests/unit/replacement-credit-consume.test.ts`, `tests/attendance/*`, `tests/unit/leave-expiry.test.ts`, `tests/unit/manager-approvals.test.ts`)
- [ ] Playwright Employee leave/clock cover the new behaviour (still open)
- [x] `pnpm typecheck` and affected tests pass
