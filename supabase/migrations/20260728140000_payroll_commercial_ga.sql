-- Payroll commercial GA: employer registration, foreign worker, duty segregation, weekly payruns

alter table public.branches
  add column if not exists epf_employer_number text,
  add column if not exists socso_employer_code text,
  add column if not exists epf_wage_rounding text not null default 'none'
    check (epf_wage_rounding in ('none', 'ceil_rm50')),
  add column if not exists lindung_employer_rate numeric(5,4) not null default 0;

alter table public.employee_profiles
  add column if not exists is_foreign_worker boolean not null default false;

alter table public.organizations
  add column if not exists payroll_duty_segregation boolean not null default false;

alter table public.payroll_payruns
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null;

alter table public.payroll_payrun_items
  add column if not exists anomaly_flags text[] not null default '{}';

alter table public.payroll_payruns
  drop constraint if exists payroll_payruns_organization_id_pay_group_id_period_year_period_month_key;

create unique index if not exists payroll_payruns_period_unique
  on public.payroll_payruns (
    organization_id,
    coalesce(pay_group_id, '00000000-0000-0000-0000-000000000000'::uuid),
    period_year,
    period_month,
    coalesce(period_week, 0)
  );
