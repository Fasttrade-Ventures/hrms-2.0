-- Australia first release, part 1: organization country, currency, ABN and standard day hours.
-- Existing organizations stay Malaysian (country MY, currency MYR, 8 hour day).

alter table public.organizations
  add column if not exists country text not null default 'MY',
  add column if not exists currency text not null default 'MYR',
  add column if not exists abn text,
  add column if not exists standard_day_hours numeric(4,2) not null default 8;

alter table public.organizations
  drop constraint if exists organizations_country_check;

alter table public.organizations
  add constraint organizations_country_check check (country in ('MY', 'AU'));

alter table public.organizations
  drop constraint if exists organizations_currency_check;

alter table public.organizations
  add constraint organizations_currency_check check (currency in ('MYR', 'AUD'));
