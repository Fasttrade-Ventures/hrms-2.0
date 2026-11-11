alter table public.organizations
  add column if not exists company_email text,
  add column if not exists company_phone text;
