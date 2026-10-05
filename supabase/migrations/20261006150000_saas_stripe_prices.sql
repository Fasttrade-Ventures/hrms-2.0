-- Revised SaaS prices and Stripe checkout sessions.
-- Professional RM 249 / RM 18 extra. Enterprise RM 449 / RM 29 extra.
-- Core stays RM 69 / RM 6 extra.

update public.billing_plans
set
  base_amount_sen_monthly = 24900,
  base_amount_sen_yearly = 249000,
  overage_amount_sen = 1800
where tier = 'professional';

update public.billing_plans
set
  base_amount_sen_monthly = 44900,
  base_amount_sen_yearly = 449000,
  overage_amount_sen = 2900
where tier = 'enterprise';

create table if not exists public.stripe_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  stripe_session_id text not null unique,
  checkout_url text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.stripe_checkout_sessions enable row level security;

drop policy if exists stripe_checkout_sessions_org on public.stripe_checkout_sessions;
create policy stripe_checkout_sessions_org on public.stripe_checkout_sessions for select
  using (organization_id in (select public.current_user_org_ids()));
