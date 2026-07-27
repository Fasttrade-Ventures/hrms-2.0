-- Payroll Malaysia v1 schema extensions

alter table public.branches
  add column if not exists hrdf_enabled boolean not null default false,
  add column if not exists hrdf_registration_number text,
  add column if not exists hrdf_rate numeric(5,4) not null default 0.01,
  add column if not exists lindung_enabled boolean not null default false,
  add column if not exists default_pay_group_id uuid references public.pay_groups(id) on delete set null;

alter table public.pay_groups
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists is_default boolean not null default false;

alter table public.payroll_components
  add column if not exists is_hrdf boolean not null default false,
  add column if not exists is_system boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order smallint not null default 0;

alter table public.payroll_payruns
  add column if not exists payrun_type text not null default 'regular'
    check (payrun_type in ('regular', 'adjustment')),
  add column if not exists scope text not null default 'pay_group'
    check (scope in ('pay_group', 'org_wide')),
  add column if not exists pay_date date,
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists period_week smallint,
  add column if not exists notes text;

alter table public.payroll_payrun_items
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists hrdf_employer numeric(14,2) not null default 0,
  add column if not exists lindung_employee numeric(14,2) not null default 0,
  add column if not exists lindung_employer numeric(14,2) not null default 0,
  add column if not exists requires_resolution boolean not null default false,
  add column if not exists resolution_note text,
  add column if not exists epf_wage_base numeric(14,2) not null default 0,
  add column if not exists socso_wage_base numeric(14,2) not null default 0,
  add column if not exists pcb_wage_base numeric(14,2) not null default 0;

create table if not exists public.employee_compensation (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pay_basis text not null default 'monthly' check (pay_basis in ('monthly', 'hourly', 'daily')),
  basic_salary numeric(14,2) not null default 0,
  hourly_rate numeric(14,4),
  daily_rate numeric(14,2),
  voluntary_epf_extra_rate numeric(5,2) not null default 0,
  socso_category_override text check (socso_category_override in ('cat1', 'cat2')),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_recurring_allowances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  component_id uuid not null references public.payroll_components(id) on delete restrict,
  amount numeric(14,2) not null,
  effective_from date not null,
  effective_to date,
  unique (employee_id, component_id, effective_from)
);

create table if not exists public.employee_tax_profiles (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  marital_status text,
  spouse_working boolean,
  zakat_annual numeric(14,2) not null default 0,
  tp1_payload jsonb not null default '{}',
  tp3_payload jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_ytd_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  calendar_year smallint not null,
  ytd_gross numeric(14,2) not null default 0,
  ytd_epf_employee numeric(14,2) not null default 0,
  ytd_socso_employee numeric(14,2) not null default 0,
  ytd_eis_employee numeric(14,2) not null default 0,
  ytd_pcb numeric(14,2) not null default 0,
  ytd_zakat numeric(14,2) not null default 0,
  opening_balance boolean not null default false,
  unique (employee_id, calendar_year)
);

create table if not exists public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payrun_id uuid not null references public.payroll_payruns(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  export_type text not null,
  file_key text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null
);

alter table public.employee_compensation enable row level security;
alter table public.employee_recurring_allowances enable row level security;
alter table public.employee_tax_profiles enable row level security;
alter table public.payroll_ytd_balances enable row level security;
alter table public.payroll_exports enable row level security;

create policy employee_compensation_org on public.employee_compensation
  for all using (organization_id in (select public.current_user_org_ids()));
create policy employee_recurring_allowances_org on public.employee_recurring_allowances
  for all using (organization_id in (select public.current_user_org_ids()));
create policy employee_tax_profiles_org on public.employee_tax_profiles
  for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_ytd_balances_org on public.payroll_ytd_balances
  for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_exports_org on public.payroll_exports
  for all using (organization_id in (select public.current_user_org_ids()));

-- Backfill compensation from employee_profiles
insert into public.employee_compensation (employee_id, organization_id, basic_salary)
select e.id, e.organization_id, coalesce(p.basic_salary, 0)
from public.employees e
left join public.employee_profiles p on p.employee_id = e.id
on conflict (employee_id) do nothing;

-- Extend immutability to item components
create or replace function public.prevent_locked_payrun_component_mutation()
returns trigger language plpgsql as $$
declare run_status public.payrun_status;
begin
  select pr.status into run_status
  from public.payroll_payruns pr
  join public.payroll_payrun_items pi on pi.payrun_id = pr.id
  where pi.id = coalesce(new.payrun_item_id, old.payrun_item_id);

  if run_status = 'locked' then
    raise exception 'Payrun is locked and cannot be modified';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_payrun_item_components_immutable on public.payroll_item_components;
create trigger trg_payrun_item_components_immutable
  before update or delete on public.payroll_item_components
  for each row execute function public.prevent_locked_payrun_component_mutation();
