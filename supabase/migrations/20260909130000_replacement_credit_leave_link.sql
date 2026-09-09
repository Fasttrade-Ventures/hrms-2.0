-- Migration: Replacement credit consume-once accounting and leave linkage
-- Ensures Replacement Leave exists in catalog and creates replacement_credit_usages ledger

insert into public.leave_types (organization_id, name, entitlement_days, requires_attachment, is_unpaid)
select o.id, 'Replacement Leave', 0::numeric, false, false
from public.organizations o
on conflict (organization_id, name) do nothing;

create table if not exists public.replacement_credit_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  replacement_credit_id uuid not null references public.replacement_credits(id) on delete cascade,
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  days numeric(4,2) not null check (days > 0),
  created_at timestamptz not null default now(),
  unique (replacement_credit_id, leave_request_id)
);

create index if not exists idx_replacement_credit_usages_org_emp 
  on public.replacement_credit_usages(organization_id, employee_id);

create index if not exists idx_replacement_credit_usages_credit
  on public.replacement_credit_usages(replacement_credit_id);

create index if not exists idx_replacement_credit_usages_leave
  on public.replacement_credit_usages(leave_request_id);

alter table public.replacement_credit_usages enable row level security;

create policy replacement_credit_usages_org on public.replacement_credit_usages
  for all using (organization_id in (select public.current_user_org_ids()));

grant all on table public.replacement_credit_usages to anon, authenticated, service_role;

-- Backfill Replacement Leave into employee_allowed_leave_types for employees with custom allowlists
insert into public.employee_allowed_leave_types (organization_id, employee_id, leave_type_id)
select distinct e.organization_id, e.id, lt.id
from public.employees e
join public.leave_types lt on lt.organization_id = e.organization_id and lt.name = 'Replacement Leave'
where exists (select 1 from public.employee_allowed_leave_types alt where alt.employee_id = e.id)
on conflict do nothing;


