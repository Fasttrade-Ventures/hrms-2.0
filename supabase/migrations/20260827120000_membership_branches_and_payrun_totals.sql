-- Multi-branch scope for branch admins (and future scoped roles).
-- employees.branch_id remains the employee's home branch.
-- Admin scope = rows in organization_membership_branches; if empty, fall back to employee home branch.

create table if not exists public.organization_membership_branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (membership_id, branch_id)
);

create index if not exists organization_membership_branches_org_idx
  on public.organization_membership_branches (organization_id);

create index if not exists organization_membership_branches_membership_idx
  on public.organization_membership_branches (membership_id);

alter table public.organization_membership_branches enable row level security;

create policy organization_membership_branches_org on public.organization_membership_branches
  for all using (organization_id in (select public.current_user_org_ids()));

-- Payrun totals aggregate (avoids loading all item rows for sum).
create or replace function public.payrun_item_totals(p_organization_id uuid, p_payrun_id uuid)
returns table (
  gross_pay numeric,
  epf_employee numeric,
  epf_employer numeric,
  socso_employee numeric,
  socso_employer numeric,
  eis_employee numeric,
  eis_employer numeric,
  pcb numeric,
  hrdf_employer numeric,
  net_pay numeric,
  flagged_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(gross_pay), 0),
    coalesce(sum(epf_employee), 0),
    coalesce(sum(epf_employer), 0),
    coalesce(sum(socso_employee), 0),
    coalesce(sum(socso_employer), 0),
    coalesce(sum(eis_employee), 0),
    coalesce(sum(eis_employer), 0),
    coalesce(sum(pcb), 0),
    coalesce(sum(hrdf_employer), 0),
    coalesce(sum(net_pay), 0),
    count(*) filter (where requires_resolution)
  from public.payroll_payrun_items
  where organization_id = p_organization_id
    and payrun_id = p_payrun_id;
$$;

revoke all on function public.payrun_item_totals(uuid, uuid) from public;
grant execute on function public.payrun_item_totals(uuid, uuid) to authenticated, service_role;
