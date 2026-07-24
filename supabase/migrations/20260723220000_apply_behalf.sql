-- Track HR apply-on-behalf submissions (auto-approved leave / late).

alter table public.leave_requests
  add column if not exists applied_on_behalf_by uuid references auth.users(id) on delete set null;

alter table public.late_requests
  add column if not exists applied_on_behalf_by uuid references auth.users(id) on delete set null;

create index if not exists leave_requests_behalf_idx
  on public.leave_requests (organization_id, applied_on_behalf_by)
  where applied_on_behalf_by is not null;

create index if not exists late_requests_behalf_idx
  on public.late_requests (organization_id, applied_on_behalf_by)
  where applied_on_behalf_by is not null;
