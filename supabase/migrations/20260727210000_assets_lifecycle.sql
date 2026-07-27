-- Assets lifecycle: categories, assignments, requests

create type public.asset_status as enum (
  'available',
  'assigned',
  'returned',
  'disposed'
);

create type public.asset_condition as enum (
  'new',
  'good',
  'fair',
  'poor',
  'damaged'
);

create type public.asset_request_kind as enum ('issue', 'return', 'replacement');

create type public.asset_request_status as enum ('open', 'resolved', 'cancelled');

create table public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  field_schema jsonb not null default '[]',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.asset_categories enable row level security;

create policy asset_categories_org on public.asset_categories
  for all using (organization_id in (select public.current_user_org_ids()));

insert into public.asset_categories (organization_id, name, description, sort_order)
select
  o.id,
  seed.name,
  seed.description,
  seed.sort_order
from public.organizations o
cross join (
  values
    ('Laptop', 'Portable computers', 10),
    ('Phone', 'Mobile devices', 20),
    ('Monitor', 'Displays', 30),
    ('Vehicle', 'Company vehicles', 40),
    ('Access card', 'Building access', 50),
    ('Other', 'General equipment', 60),
    ('Uncategorized', 'Legacy or unclassified assets', 999)
) as seed(name, description, sort_order)
on conflict (organization_id, name) do nothing;

alter table public.assets
  add column category_id uuid references public.asset_categories(id) on delete restrict,
  add column status public.asset_status not null default 'available',
  add column condition public.asset_condition,
  add column branch_id uuid references public.branches(id) on delete set null,
  add column notes text,
  add column purchase_date date,
  add column purchase_value numeric(12, 2),
  add column warranty_expires_on date,
  add column custom_values jsonb not null default '{}',
  add column updated_at timestamptz not null default now();

update public.assets a
set category_id = ac.id
from public.asset_categories ac
where ac.organization_id = a.organization_id
  and a.category_id is null
  and (
    (a.category is not null and lower(trim(a.category)) = lower(trim(ac.name)))
    or (a.category is null and ac.name = 'Uncategorized')
  );

update public.assets a
set category_id = ac.id
from public.asset_categories ac
where ac.organization_id = a.organization_id
  and a.category_id is null
  and ac.name = 'Uncategorized';

create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name text not null,
  employee_number text,
  assigned_at date not null default current_date,
  returned_at date,
  acknowledged_at timestamptz,
  assigned_by_user_id uuid references auth.users(id),
  returned_by_user_id uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  constraint asset_assignments_return_after_assign check (
    returned_at is null or returned_at >= assigned_at
  )
);

create index asset_assignments_asset_active_idx
  on public.asset_assignments (asset_id)
  where returned_at is null;

create unique index asset_assignments_one_active_per_asset
  on public.asset_assignments (asset_id)
  where returned_at is null;

alter table public.asset_assignments enable row level security;

create policy asset_assignments_org on public.asset_assignments
  for all using (organization_id in (select public.current_user_org_ids()));

insert into public.asset_assignments (
  organization_id,
  asset_id,
  employee_id,
  employee_name,
  employee_number,
  assigned_at,
  returned_at
)
select
  a.organization_id,
  a.id,
  a.assigned_employee_id,
  coalesce(e.full_name, e.email, 'Unknown employee'),
  e.employee_number,
  coalesce(a.issued_at, current_date),
  a.returned_at
from public.assets a
left join public.employees e on e.id = a.assigned_employee_id
where a.assigned_employee_id is not null;

update public.assets a
set status = case
  when a.returned_at is not null then 'returned'::public.asset_status
  when a.assigned_employee_id is not null then 'assigned'::public.asset_status
  else 'available'::public.asset_status
end;

alter table public.assets
  alter column category_id set not null;

alter table public.assets
  drop column category,
  drop column assigned_employee_id,
  drop column issued_at,
  drop column returned_at;

create table public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  assignment_id uuid references public.asset_assignments(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind public.asset_request_kind not null,
  status public.asset_request_status not null default 'open',
  message text,
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index asset_requests_asset_open_idx
  on public.asset_requests (asset_id, kind)
  where status = 'open';

alter table public.asset_requests enable row level security;

create policy asset_requests_org on public.asset_requests
  for all using (organization_id in (select public.current_user_org_ids()));
