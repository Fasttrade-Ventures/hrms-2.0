-- Migration: Apply-on-Behalf Support for Claims, Overtime, and Replacement Credits

alter table public.claims
  add column if not exists applied_on_behalf_by uuid references auth.users(id) on delete set null;

alter table public.overtime_requests
  add column if not exists applied_on_behalf_by uuid references auth.users(id) on delete set null;

alter table public.replacement_credits
  add column if not exists applied_on_behalf_by uuid references auth.users(id) on delete set null;

create index if not exists claims_behalf_idx
  on public.claims (organization_id, applied_on_behalf_by)
  where applied_on_behalf_by is not null;

create index if not exists overtime_requests_behalf_idx
  on public.overtime_requests (organization_id, applied_on_behalf_by)
  where applied_on_behalf_by is not null;

create index if not exists replacement_credits_behalf_idx
  on public.replacement_credits (organization_id, applied_on_behalf_by)
  where applied_on_behalf_by is not null;

grant all on public.claims to authenticated, service_role, anon;
grant all on public.overtime_requests to authenticated, service_role, anon;
grant all on public.replacement_credits to authenticated, service_role, anon;
