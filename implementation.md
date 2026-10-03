# Implementation Plan: [HR Admin] Leave Accrual, Carry-Forward & Expiry Background Jobs

## 1. Overview & Objectives

This implementation delivers automated periodic background jobs and administrative configuration for leave entitlement management in HRMS 2.0:
1. **Leave Policy Rules Configuration**: Support monthly accrual rates, maximum carry-forward day caps, and carry-forward expiry cutoff dates per leave type in the HR portal.
2. **Monthly Accrual Scheduled Job**: Scheduled automated job / edge function to calculate and credit monthly leave entitlements for active employees with full idempotency.
3. **Year-End Carry-Forward & Expiry Job**: Automated year-end rollover job that evaluates unused balances, enforces carry-forward caps, forfeits unallowable excess, and expires unutilized carry-forwards at the configured cutoff date.
4. **HR Leave Balance Audit Log**: Immutable ledger and HR audit logging interface to track every automated credit, rollover, expiration, and manual adjustment.

---

## 2. Technical Architecture & Data Model

### 2.1 Database Schema Enhancements

#### A. Migration: `supabase/migrations/20261001160000_leave_accrual_carry_forward.sql`

```sql
-- 1. Extend leave_types with accrual & carry-forward policy configuration
alter table public.leave_types
  add column if not exists accrual_frequency text not null default 'none'
    check (accrual_frequency in ('none', 'monthly', 'yearly')),
  add column if not exists monthly_accrual_rate numeric(5,2) not null default 0,
  add column if not exists carry_forward_enabled boolean not null default false,
  add column if not exists max_carry_forward_days numeric(5,2) not null default 0,
  add column if not exists carry_forward_expiry_months integer default 6,
  add column if not exists carry_forward_expiry_cutoff_date text default '06-30';

-- 2. Create leave_balance_audit_logs ledger
create table if not exists public.leave_balance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  action_type text not null check (action_type in (
    'monthly_accrual',
    'year_end_carry_forward',
    'carry_forward_forfeited',
    'carry_forward_expiry',
    'manual_adjustment',
    'request_deduction',
    'request_reversal'
  )),
  previous_balance numeric(6,2) not null default 0,
  delta_days numeric(6,2) not null,
  new_balance numeric(6,2) not null,
  effective_date date not null default current_date,
  reason text,
  actor_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint uq_leave_balance_idempotency unique (organization_id, idempotency_key)
);

create index if not exists idx_leave_balance_audit_logs_emp
  on public.leave_balance_audit_logs (organization_id, employee_id, leave_type_id, created_at desc);

create index if not exists idx_leave_balance_audit_logs_org_date
  on public.leave_balance_audit_logs (organization_id, effective_date desc);

-- RLS
alter table public.leave_balance_audit_logs enable row level security;

create policy leave_balance_audit_logs_org on public.leave_balance_audit_logs for select
  using (organization_id in (select public.current_user_org_ids()));
```

---

## 3. Core Modules & Implementation Steps

### Phase 1: Policy Rules Configuration & UI (Checklist Item #1)

- **Validation Schema**:
  - Update `@hrms/validation` or local schema in `apps/web/src/lib/validation/leave.ts` / `organization.ts` to validate:
    - `accrualFrequency`: `'none' | 'monthly' | 'yearly'`
    - `monthlyAccrualRate`: number >= 0
    - `carryForwardEnabled`: boolean
    - `maxCarryForwardDays`: number >= 0
    - `carryForwardExpiryCutoffDate`: string (format `MM-DD`, e.g. `'06-30'`)
- **HR Leave Type Form**:
  - Update `apps/web/src/components/hr/organization/leave-types.tsx` (and `LeaveTypeForm`):
    - Add "Accrual Rules" section: frequency select, monthly accrual rate input.
    - Add "Carry-Forward & Expiry" section: toggle carry-forward, max carry-forward days input, cutoff date picker/input.
  - Update `apps/web/src/app/(hr)/hr/organization/actions.ts`:
    - Persist `accrual_frequency`, `monthly_accrual_rate`, `carry_forward_enabled`, `max_carry_forward_days`, `carry_forward_expiry_cutoff_date` in `createLeaveType` and `updateLeaveType`.
  - Update `apps/web/src/lib/hr/organization.ts`:
    - Include new policy fields in `LeaveTypeRow`, `listLeaveTypes`, and `getLeaveType`.

---

### Phase 2: Monthly Accrual Scheduled Job (Checklist Item #2)

- **Service Layer**: `apps/web/src/lib/leave/accrual.ts`
  - Function `performMonthlyLeaveAccrual({ asOfDate, organizationId, dryRun })`:
    1. Resolve active employees for target organization(s).
    2. Query leave types with `accrual_frequency = 'monthly'`.
    3. For each employee:
       - Calculate monthly accrual delta (e.g. `monthly_accrual_rate > 0 ? monthly_accrual_rate : (entitlement_days / 12)`).
       - Generate idempotency key: `monthly_accrual:${orgId}:${employeeId}:${leaveTypeId}:${yearMonth}`.
       - Increment employee entitlement / balance.
       - Insert immutable record into `leave_balance_audit_logs`.
       - Log general audit event (`leave.balance_accrued`).
       - Optionally queue in-app notification: "Monthly leave accrual credited: +X days".
- **Cron Route Handler**: `apps/web/src/app/api/cron/leave-accrual/route.ts`
  - Verify `Authorization: Bearer <CRON_SECRET>`.
  - Accept query parameters: `asOf` (for backfilling/testing), `organizationId`, `dryRun`.
  - Call `performMonthlyLeaveAccrual`.
  - Return JSON summary: `{ ok: true, processedCount, totalAccruedDays, auditLogIds }`.
- **Cron Schedule**:
  - Add to `apps/web/vercel.json`:
    ```json
    {
      "path": "/api/cron/leave-accrual",
      "schedule": "0 0 1 * *"
    }
    ```

---

### Phase 3: Year-End Carry-Forward & Expiry Scheduled Job (Checklist Item #3)

- **Service Layer**: `apps/web/src/lib/leave/rollover.ts`
  - Function `performYearEndCarryForward({ year, organizationId, dryRun })`:
    1. Identify leave types where `carry_forward_enabled = true`.
    2. For each employee:
       - Compute remaining balance at conclusion of year `year - 1`: `remainingDays = Math.max(0, entitlement + carry_forward - used)`.
       - Compute allowable carry-forward: `carried = Math.min(remainingDays, max_carry_forward_days)`.
       - Compute forfeited days: `forfeited = remainingDays - carried`.
       - Generate idempotency key: `year_end_carry_forward:${orgId}:${employeeId}:${leaveTypeId}:${year}`.
       - Update employee `annual_leave_carry_forward = carried` and reset base entitlement for the new calendar year.
       - Write audit log entries (`year_end_carry_forward`, `carry_forward_forfeited`).
       - Queue notification to employee regarding carried-over days and any forfeited balance.
  - Function `performCarryForwardExpiry({ asOfDate, organizationId, dryRun })`:
    1. Check if `asOfDate` matches or passes `carry_forward_expiry_cutoff_date` (e.g., June 30 of current year).
    2. For each employee with `annual_leave_carry_forward > 0`:
       - Calculate unused portion of carried forward leave.
       - Generate idempotency key: `carry_forward_expiry:${orgId}:${employeeId}:${leaveTypeId}:${year}`.
       - Zero out expired carried forward balance.
       - Write audit log entry `carry_forward_expiry`.
       - Queue in-app notification to employee regarding expired carry-forward.
- **Cron Route Handler**: `apps/web/src/app/api/cron/leave-rollover/route.ts` (or expand `/api/cron/leave-expiry` & `/api/cron/leave-rollover`):
  - Protected with `CRON_SECRET`.
  - Runs year-end carry forward on Jan 1 (`0 0 1 1 *`) and daily expiry sweeps.

---

### Phase 4: HR Leave Balance Audit Log (Checklist Item #4)

- **Data Query & Service**: `apps/web/src/lib/leave/audit.ts`
  - Function `listLeaveBalanceAuditLogs({ organizationId, employeeId, leaveTypeId, actionType, startDate, endDate, page, pageSize })`:
    - Returns paginated audit rows with employee names, leave type names, delta amounts, before/after balances, effective dates, and reasons.
  - Function `recordLeaveBalanceAdjustment({ organizationId, employeeId, leaveTypeId, deltaDays, reason, actorUserId })`:
    - Allows HR Admin to make manual balance adjustments with obligatory reason and audit capture.
- **UI Integration**:
  - Add "Balance Audit Log" tab or view under `/hr/leave/audit-logs` (or `/hr/leave?tab=audit` / `/hr/organization/leave-types/audit`).
  - Render high-visibility audit table with badges:
    - `Accrual` (Green / +X.X days)
    - `Carry Forward` (Blue / +X.X days)
    - `Expired / Forfeited` (Red / -X.X days)
    - `Manual Adjustment` (Amber / ±X.X days)
  - Include search by employee name, leave type filter, and date range filters.

---

## 4. Verification & Testing Strategy

### 4.1 Automated Vitest Test Suites

1. **`tests/leave/leave-policy-rules.test.ts`**:
   - Tests leave type creation/updates with monthly accrual rates and carry-forward rules.
   - Tests validation edge cases (negative accrual rates, invalid cutoff dates, excessive carry-forward caps).
2. **`tests/leave/monthly-accrual.test.ts`**:
   - Tests monthly accrual calculations for full-time employees.
   - Verifies idempotency (running twice for the same `YYYY-MM` produces zero duplicate increments).
   - Verifies proper ledger entries in `leave_balance_audit_logs`.
   - Tests dry-run mode vs real commit.
3. **`tests/leave/carry-forward-expiry.test.ts`**:
   - Tests year-end rollover: capping at `max_carry_forward_days`, correctly forfeiting excess days.
   - Tests carry-forward expiry cutoff: expiring remaining carried days on June 30 / configured cutoff date.
   - Verifies notification triggers and audit log recordings.
4. **`tests/leave/leave-balance-audit.test.ts`**:
   - Tests retrieval, filtering, pagination, and manual adjustments via the balance audit log service.
5. **`tests/leave/cron-endpoints.test.ts`**:
   - Tests `/api/cron/leave-accrual` and `/api/cron/leave-rollover` authentication (401 without secret, 200 with valid secret).

---

## 5. Implementation Checklist & Acceptance Matrix

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 1 | DB Schema Migration | `20261001160000_leave_accrual_carry_forward.sql` | ⬜ Planned |
| 2 | Leave Type Policy UI & Actions | `leave-types.tsx`, `actions.ts`, `organization.ts` | ⬜ Planned |
| 3 | Monthly Accrual Core Engine | `apps/web/src/lib/leave/accrual.ts` | ⬜ Planned |
| 4 | Monthly Accrual Cron Route | `apps/web/src/app/api/cron/leave-accrual/route.ts` + `vercel.json` | ⬜ Planned |
| 5 | Carry-Forward & Expiry Engine | `apps/web/src/lib/leave/rollover.ts` | ⬜ Planned |
| 6 | Carry-Forward & Expiry Cron Route | `apps/web/src/app/api/cron/leave-rollover/route.ts` | ⬜ Planned |
| 7 | Leave Balance Audit Log Service & UI | `apps/web/src/lib/leave/audit.ts`, `/hr/leave` audit view | ⬜ Planned |
| 8 | Automated Tests | `tests/leave/*.test.ts` covering all acceptance criteria | ⬜ Planned |
