-- Leave blackout periods (Professional tier — org-wide blocked date ranges)

create table if not exists public.leave_blackout_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  leave_type_ids uuid[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_blackout_periods_date_range check (end_date >= start_date)
);

create index if not exists leave_blackout_periods_org_dates_idx
  on public.leave_blackout_periods (organization_id, start_date, end_date);

alter table public.leave_blackout_periods enable row level security;

create policy leave_blackout_periods_org on public.leave_blackout_periods for all
  using (organization_id in (select public.current_user_org_ids()));
