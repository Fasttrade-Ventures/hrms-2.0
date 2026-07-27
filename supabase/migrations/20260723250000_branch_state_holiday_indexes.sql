-- Branch state for Malaysia public-holiday import by region
alter table public.branches
  add column if not exists state text;

comment on column public.branches.state is 'Malaysian state/FT for public holiday import (MyCal API).';

-- Prevent duplicate holidays per branch date (branch-scoped imports)
create unique index if not exists holidays_org_branch_date_unique
  on public.holidays (organization_id, branch_id, holiday_date)
  where branch_id is not null;

-- Prevent duplicate org-wide holidays on the same date
create unique index if not exists holidays_org_date_orgwide_unique
  on public.holidays (organization_id, holiday_date)
  where branch_id is null;
