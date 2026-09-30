-- Positions / Job Titles Catalog

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  department_id uuid references public.departments(id) on delete set null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, title)
);

alter table public.employees
  add column if not exists position_id uuid references public.positions(id) on delete set null;

create index if not exists idx_positions_org on public.positions(organization_id);
create index if not exists idx_positions_department on public.positions(department_id);
create index if not exists idx_employees_position on public.employees(position_id);

alter table public.positions enable row level security;

grant all on table public.positions to anon, authenticated, service_role;

drop policy if exists positions_org on public.positions;
create policy positions_org on public.positions for all
  using (organization_id in (select public.current_user_org_ids()));

-- Backfill positions from existing distinct employee job_titles
insert into public.positions (organization_id, title, department_id, is_active)
select distinct e.organization_id, trim(e.job_title), e.department_id, true
from public.employees e
where e.job_title is not null and trim(e.job_title) <> ''
on conflict (organization_id, title) do nothing;

-- Link existing employees to their newly created position records
update public.employees e
set position_id = p.id
from public.positions p
where p.organization_id = e.organization_id
  and p.title = trim(e.job_title)
  and e.position_id is null
  and e.job_title is not null
  and trim(e.job_title) <> '';
