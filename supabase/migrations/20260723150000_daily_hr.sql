-- Phase 4–6: Leave, attendance, claims, OT, replacement credit

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  entitlement_days numeric(6,2) not null default 0,
  requires_attachment boolean not null default false,
  is_unpaid boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  created_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  half_day boolean not null default false,
  days numeric(6,2) not null,
  reason text,
  status public.approval_status not null default 'draft',
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.replacement_credits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  credit_days numeric(4,2) not null default 1,
  description text,
  status public.approval_status not null default 'draft',
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  session smallint not null default 1,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  status text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  ip_address inet,
  created_at timestamptz not null default now(),
  unique (organization_id, employee_id, work_date, session)
);

create table public.attendance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  request_date date not null,
  session smallint not null default 1,
  clock_in_time time,
  clock_out_time time,
  hours numeric(5,2),
  reason text,
  status public.approval_status not null default 'draft',
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.late_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  request_date date not null,
  actual_arrival_time time not null,
  reason text,
  status public.approval_status not null default 'draft',
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  hours numeric(5,2) not null,
  rate_type text not null check (rate_type in ('1.5', '2.0', '3.0')),
  reason text,
  status public.approval_status not null default 'draft',
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.claim_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  max_amount numeric(12,2),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  claim_type_id uuid not null references public.claim_types(id) on delete restrict,
  amount numeric(12,2) not null,
  receipt_date date not null,
  description text,
  receipt_file_id uuid references public.file_objects(id) on delete set null,
  status public.approval_status not null default 'draft',
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.leave_types enable row level security;
alter table public.holidays enable row level security;
alter table public.leave_requests enable row level security;
alter table public.replacement_credits enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_requests enable row level security;
alter table public.late_requests enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.claim_types enable row level security;
alter table public.claims enable row level security;

create policy leave_types_org on public.leave_types for all using (organization_id in (select public.current_user_org_ids()));
create policy holidays_org on public.holidays for all using (organization_id in (select public.current_user_org_ids()));
create policy leave_requests_org on public.leave_requests for all using (organization_id in (select public.current_user_org_ids()));
create policy replacement_credits_org on public.replacement_credits for all using (organization_id in (select public.current_user_org_ids()));
create policy attendance_records_org on public.attendance_records for all using (organization_id in (select public.current_user_org_ids()));
create policy attendance_requests_org on public.attendance_requests for all using (organization_id in (select public.current_user_org_ids()));
create policy late_requests_org on public.late_requests for all using (organization_id in (select public.current_user_org_ids()));
create policy overtime_requests_org on public.overtime_requests for all using (organization_id in (select public.current_user_org_ids()));
create policy claim_types_org on public.claim_types for all using (organization_id in (select public.current_user_org_ids()));
create policy claims_org on public.claims for all using (organization_id in (select public.current_user_org_ids()));
