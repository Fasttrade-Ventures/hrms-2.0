-- Year-end exports (CP8D, EA) are not tied to a single payrun.
alter table public.payroll_exports
  alter column payrun_id drop not null;
