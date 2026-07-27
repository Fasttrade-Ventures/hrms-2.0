alter table public.employee_tax_profiles
  add column if not exists zakat_monthly numeric(14,2) not null default 0;
