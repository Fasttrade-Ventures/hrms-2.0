-- Versioned company policies and employee acknowledgements.

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  version integer not null default 1 check (version > 0),
  file_id uuid references public.file_objects(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  version integer not null check (version > 0),
  acknowledged_at timestamptz not null default now(),
  unique (policy_id, employee_id, version)
);

create index if not exists idx_policies_org on public.policies(organization_id);
create index if not exists idx_policy_ack_policy on public.policy_acknowledgements(policy_id, version);

alter table public.policies enable row level security;
alter table public.policy_acknowledgements enable row level security;

drop policy if exists policies_org on public.policies;
create policy policies_org on public.policies for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists policy_ack_org on public.policy_acknowledgements;
create policy policy_ack_org on public.policy_acknowledgements for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
