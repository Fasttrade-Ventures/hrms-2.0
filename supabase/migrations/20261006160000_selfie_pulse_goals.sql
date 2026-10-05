alter table public.organizations
  add column if not exists require_clock_in_selfie boolean not null default false;

alter table public.attendance_records
  add column if not exists selfie_file_id uuid references public.file_objects(id) on delete set null;

create table if not exists public.pulse_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question text not null,
  opens_on date not null,
  closes_on date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.pulse_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  survey_id uuid not null references public.pulse_surveys(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  score smallint not null check (score between 0 and 10),
  created_at timestamptz not null default now(),
  unique (survey_id, employee_id)
);

create table if not exists public.appraisal_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_cycle_id uuid not null references public.review_cycles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  note text,
  status text not null default 'open' check (status in ('open', 'done')),
  manager_note text,
  created_at timestamptz not null default now()
);

alter table public.pulse_surveys enable row level security;
alter table public.pulse_responses enable row level security;
alter table public.appraisal_goals enable row level security;

drop policy if exists pulse_surveys_org on public.pulse_surveys;
create policy pulse_surveys_org on public.pulse_surveys for all
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists pulse_responses_org on public.pulse_responses;
create policy pulse_responses_org on public.pulse_responses for all
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists appraisal_goals_org on public.appraisal_goals;
create policy appraisal_goals_org on public.appraisal_goals for all
  using (organization_id in (select public.current_user_org_ids()));
