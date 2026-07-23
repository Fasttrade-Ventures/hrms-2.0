-- Phase 1–2: Core platform + identity foundation

create extension if not exists "pgcrypto";

-- Enums
create type public.product_tier as enum ('core', 'professional', 'enterprise');
create type public.employee_status as enum ('active', 'inactive', 'terminated');
create type public.approval_status as enum ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'revoked');
create type public.weekend_mode as enum ('sat_sun', 'fri_sat', 'sun_only');
create type public.payrun_status as enum ('draft', 'in_review', 'approved', 'locked');

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Kuala_Lumpur',
  product_tier public.product_tier not null default 'core',
  module_flags jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  weekend_mode public.weekend_mode not null default 'sat_sun',
  payroll_cutoff_day smallint not null default 6 check (payroll_cutoff_day between 1 and 28),
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_number text not null,
  full_name text not null,
  email text not null,
  branch_id uuid references public.branches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  manager_employee_id uuid references public.employees(id) on delete set null,
  shift_id uuid references public.shifts(id) on delete set null,
  status public.employee_status not null default 'active',
  join_date date not null,
  legacy_user_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_number),
  unique (organization_id, email)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  roles text[] not null default '{}',
  permissions text[] not null default '{}',
  branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.employee_profiles (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone text,
  ic_number text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text default 'MY',
  bank_name text,
  bank_account_number text,
  epf_number text,
  socso_number text,
  tax_number text,
  eis_eligible boolean not null default true,
  epf_employee_rate numeric(5,2) not null default 11,
  epf_employer_rate numeric(5,2) not null default 12,
  basic_salary numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employee_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  relationship text,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.legacy_id_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,
  legacy_id text not null,
  new_id uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, domain, legacy_id)
);

-- RLS helper
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.organization_memberships where user_id = auth.uid();
$$;

alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.shifts enable row level security;
alter table public.employees enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.employee_emergency_contacts enable row level security;

create policy org_select on public.organizations for select
  using (id in (select public.current_user_org_ids()));

create policy branches_org on public.branches for all
  using (organization_id in (select public.current_user_org_ids()));

create policy departments_org on public.departments for all
  using (organization_id in (select public.current_user_org_ids()));

create policy shifts_org on public.shifts for all
  using (organization_id in (select public.current_user_org_ids()));

create policy employees_org on public.employees for all
  using (organization_id in (select public.current_user_org_ids()));

create policy memberships_org on public.organization_memberships for select
  using (organization_id in (select public.current_user_org_ids()));

create policy profiles_org on public.employee_profiles for all
  using (organization_id in (select public.current_user_org_ids()));

create policy emergency_org on public.employee_emergency_contacts for all
  using (organization_id in (select public.current_user_org_ids()));

create index idx_employees_org on public.employees(organization_id);
create index idx_memberships_user on public.organization_memberships(user_id);
