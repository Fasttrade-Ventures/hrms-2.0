-- Phase 5: Professional tier — geofencing, rosters, scheduled reports

alter table public.branches
  add column if not exists geofence_enabled boolean not null default false,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists geofence_radius_m integer not null default 100;

create table if not exists public.roster_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete restrict,
  work_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, work_date)
);

create index if not exists roster_entries_org_date_idx
  on public.roster_entries (organization_id, work_date);

alter table public.roster_entries enable row level security;

create policy roster_entries_org on public.roster_entries for all
  using (organization_id in (select public.current_user_org_ids()));

create table if not exists public.report_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_slug text not null,
  schedule text not null check (schedule in ('daily', 'weekly', 'monthly')),
  filters jsonb not null default '{}',
  recipient_user_id uuid not null,
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_subscriptions_due_idx
  on public.report_subscriptions (organization_id, enabled, next_run_at);

alter table public.report_subscriptions enable row level security;

create policy report_subscriptions_org on public.report_subscriptions for all
  using (organization_id in (select public.current_user_org_ids()));
