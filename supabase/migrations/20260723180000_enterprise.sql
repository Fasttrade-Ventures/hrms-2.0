-- Phase 9: Enterprise subscriptions (SaaS)

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  tier public.product_tier not null default 'core',
  module_overrides jsonb not null default '{}',
  valid_from date not null default current_date,
  valid_until date,
  created_at timestamptz not null default now()
);

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.organization_subscriptions enable row level security;
alter table public.integration_connections enable row level security;

create policy org_subscriptions on public.organization_subscriptions for select
  using (organization_id in (select public.current_user_org_ids()));

create policy integration_connections_org on public.integration_connections for all
  using (organization_id in (select public.current_user_org_ids()));
