-- Extended employee profile fields for full create/edit (employment, personal, family).

alter table public.employees
  add column if not exists employment_type text
    check (employment_type is null or employment_type in ('full_time', 'part_time', 'contract', 'intern')),
  add column if not exists job_title text,
  add column if not exists confirmation_status text
    check (confirmation_status is null or confirmation_status in ('probation', 'confirmed', 'contract')),
  add column if not exists pay_group_id uuid references public.pay_groups(id) on delete set null,
  add column if not exists annual_leave_entitlement numeric(6,2) not null default 14,
  add column if not exists annual_leave_carry_forward numeric(6,2) not null default 0;

alter table public.employee_profiles
  add column if not exists date_of_birth date,
  add column if not exists gender text
    check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  add column if not exists race text,
  add column if not exists religion text,
  add column if not exists marital_status text
    check (marital_status is null or marital_status in ('single', 'married', 'divorced', 'widowed')),
  add column if not exists pay_basis text
    check (pay_basis is null or pay_basis in ('monthly', 'daily', 'hourly')),
  add column if not exists working_days_per_month numeric(4,1) not null default 21,
  add column if not exists profile_photo_path text,
  add column if not exists residential_address text;

create table if not exists public.employee_dependents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  dependent_type text not null check (dependent_type in ('spouse', 'child')),
  full_name text not null,
  ic_number text,
  is_working boolean,
  date_of_birth date,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_allowed_leave_types (
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (employee_id, leave_type_id)
);

create index if not exists idx_employee_dependents_employee
  on public.employee_dependents(employee_id);

alter table public.employee_dependents enable row level security;
alter table public.employee_allowed_leave_types enable row level security;

drop policy if exists employee_dependents_org on public.employee_dependents;
create policy employee_dependents_org on public.employee_dependents for all
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists employee_allowed_leave_types_org on public.employee_allowed_leave_types;
create policy employee_allowed_leave_types_org on public.employee_allowed_leave_types for all
  using (organization_id in (select public.current_user_org_ids()));
