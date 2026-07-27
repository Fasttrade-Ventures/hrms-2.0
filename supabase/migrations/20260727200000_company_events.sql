-- Calendar: HR company events (training, closures, town halls)

create type public.company_event_kind as enum (
  'training',
  'office_closure',
  'town_hall',
  'other'
);

create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  kind public.company_event_kind not null default 'other',
  start_date date not null,
  end_date date not null,
  branch_id uuid references public.branches(id) on delete cascade,
  target_department_ids uuid[] not null default '{}',
  all_day boolean not null default true,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_events_date_order check (end_date >= start_date)
);

create index if not exists company_events_org_dates_idx
  on public.company_events (organization_id, start_date, end_date);

alter table public.company_events enable row level security;

create policy company_events_org on public.company_events
  for all using (organization_id in (select public.current_user_org_ids()));
