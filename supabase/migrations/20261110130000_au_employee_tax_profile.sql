-- Australia first release, part 2: Australian employee record.
-- tax_number stays the stored identifier (Tax File Number for Australia).
-- BukuHR stores these details for HR and the pay file. It does not calculate PAYG or super.

alter table public.employee_profiles
  add column if not exists employment_basis text,
  add column if not exists hourly_rate numeric(12,2),
  add column if not exists bsb text,
  add column if not exists super_fund_name text,
  add column if not exists super_usi text,
  add column if not exists super_member_number text,
  add column if not exists tax_free_threshold boolean not null default false,
  add column if not exists study_loan boolean not null default false;

alter table public.employee_profiles
  drop constraint if exists employee_profiles_employment_basis_check;

alter table public.employee_profiles
  add constraint employee_profiles_employment_basis_check
  check (employment_basis is null or employment_basis in ('full_time', 'part_time', 'casual'));
