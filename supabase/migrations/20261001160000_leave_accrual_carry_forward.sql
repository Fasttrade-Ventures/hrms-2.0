-- Migration: Leave Accrual, Carry-Forward & Expiry Background Jobs

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

-- 3. RLS for leave_balance_audit_logs
alter table public.leave_balance_audit_logs enable row level security;

create policy leave_balance_audit_logs_org on public.leave_balance_audit_logs for select
  using (organization_id in (select public.current_user_org_ids()));
