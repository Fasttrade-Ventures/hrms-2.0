-- Null means unlimited so existing orgs keep working.
alter table public.organizations
  add column if not exists licensed_headcount integer;

alter table public.organizations
  drop constraint if exists organizations_licensed_headcount_positive;

alter table public.organizations
  add constraint organizations_licensed_headcount_positive
  check (licensed_headcount is null or licensed_headcount > 0);
