-- Letter templates (offer + employment agreement) and offer response/sign tokens.

create table if not exists public.hr_letter_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null check (type in ('offer', 'employment_agreement')),
  body text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hr_letter_templates_org_type
  on public.hr_letter_templates (organization_id, type, is_active);

alter table public.hr_letter_templates enable row level security;

drop policy if exists hr_letter_templates_org on public.hr_letter_templates;
create policy hr_letter_templates_org on public.hr_letter_templates for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

create table if not exists public.job_offer_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  offer_id uuid not null references public.job_offers(id) on delete cascade,
  purpose text not null check (purpose in ('respond', 'sign')),
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create index if not exists idx_job_offer_tokens_offer
  on public.job_offer_tokens (offer_id, purpose);

alter table public.job_offer_tokens enable row level security;

drop policy if exists job_offer_tokens_org on public.job_offer_tokens;
create policy job_offer_tokens_org on public.job_offer_tokens for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

alter table public.job_offers
  add column if not exists template_id uuid references public.hr_letter_templates(id) on delete set null;

alter table public.job_offers
  add column if not exists agreement_file_id uuid references public.file_objects(id) on delete set null;
