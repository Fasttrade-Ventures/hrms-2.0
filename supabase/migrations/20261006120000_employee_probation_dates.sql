-- Probation end date and confirmation date for HR confirmation workflow.

alter table public.employees
  add column if not exists probation_end_date date,
  add column if not exists confirmed_on date;
