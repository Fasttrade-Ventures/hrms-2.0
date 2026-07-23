-- Phase 8: Malaysia payroll core

create table public.pay_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  cycle text not null check (cycle in ('monthly', 'weekly', 'biweekly')),
  cutoff_day smallint not null default 6,
  created_at timestamptz not null default now()
);

create table public.payroll_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  component_type text not null check (component_type in ('earning', 'deduction', 'employer')),
  is_epf boolean not null default false,
  is_socso boolean not null default false,
  is_eis boolean not null default false,
  is_pcb boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.payroll_payruns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pay_group_id uuid references public.pay_groups(id) on delete set null,
  period_year smallint not null,
  period_month smallint not null check (period_month between 1 and 12),
  earning_period_start date not null,
  earning_period_end date not null,
  status public.payrun_status not null default 'draft',
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, pay_group_id, period_year, period_month)
);

create table public.payroll_payrun_items (
  id uuid primary key default gen_random_uuid(),
  payrun_id uuid not null references public.payroll_payruns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  gross_pay numeric(14,2) not null default 0,
  statutory_wage_base numeric(14,2) not null default 0,
  epf_employee numeric(14,2) not null default 0,
  epf_employer numeric(14,2) not null default 0,
  socso_employee numeric(14,2) not null default 0,
  socso_employer numeric(14,2) not null default 0,
  eis_employee numeric(14,2) not null default 0,
  eis_employer numeric(14,2) not null default 0,
  pcb numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (payrun_id, employee_id)
);

create table public.payroll_item_components (
  id uuid primary key default gen_random_uuid(),
  payrun_item_id uuid not null references public.payroll_payrun_items(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  component_id uuid not null references public.payroll_components(id) on delete restrict,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table public.payroll_payrun_status_log (
  id uuid primary key default gen_random_uuid(),
  payrun_id uuid not null references public.payroll_payruns(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  from_status public.payrun_status,
  to_status public.payrun_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.statutory_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_set text not null,
  effective_from date not null,
  effective_to date,
  source_url text,
  checksum text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.pay_groups enable row level security;
alter table public.payroll_components enable row level security;
alter table public.payroll_payruns enable row level security;
alter table public.payroll_payrun_items enable row level security;
alter table public.payroll_item_components enable row level security;
alter table public.payroll_payrun_status_log enable row level security;
alter table public.statutory_rule_versions enable row level security;

create policy pay_groups_org on public.pay_groups for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_components_org on public.payroll_components for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_payruns_org on public.payroll_payruns for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_payrun_items_org on public.payroll_payrun_items for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_item_components_org on public.payroll_item_components for all using (organization_id in (select public.current_user_org_ids()));
create policy payroll_status_log_org on public.payroll_payrun_status_log for select using (organization_id in (select public.current_user_org_ids()));
create policy statutory_versions_read on public.statutory_rule_versions for select using (true);

-- Immutability: locked payrun items cannot be updated
create or replace function public.prevent_locked_payrun_item_mutation()
returns trigger language plpgsql as $$
declare run_status public.payrun_status;
begin
  select status into run_status from public.payroll_payruns where id = coalesce(new.payrun_id, old.payrun_id);
  if run_status = 'locked' then
    raise exception 'Payrun is locked and cannot be modified';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_payrun_items_immutable
  before update or delete on public.payroll_payrun_items
  for each row execute function public.prevent_locked_payrun_item_mutation();
