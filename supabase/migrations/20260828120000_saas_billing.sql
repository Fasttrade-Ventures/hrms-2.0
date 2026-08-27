-- SaaS subscription billing (Billplz)

create type public.billing_interval as enum ('month', 'year');

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused'
);

create type public.invoice_status as enum (
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible'
);

create type public.invoice_type as enum ('subscription', 'overage');

create type public.billplz_bill_state as enum ('due', 'paid', 'deleted');

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  tier public.product_tier not null unique,
  name text not null,
  base_amount_sen_monthly integer not null check (base_amount_sen_monthly > 0),
  base_amount_sen_yearly integer not null check (base_amount_sen_yearly > 0),
  overage_amount_sen integer not null check (overage_amount_sen >= 0),
  included_headcount integer not null default 10 check (included_headcount > 0),
  billplz_collection_id text,
  trial_days integer not null default 14 check (trial_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  billing_interval public.billing_interval not null default 'month',
  status public.subscription_status not null default 'trialing',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  billplz_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_billing_subscriptions_status_idx
  on public.organization_billing_subscriptions (status, current_period_end);

create table public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid not null references public.organization_billing_subscriptions(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  invoice_type public.invoice_type not null default 'subscription',
  amount_sen integer not null check (amount_sen >= 0),
  sst_sen integer not null check (sst_sen >= 0),
  total_sen integer not null check (total_sen >= 0),
  active_employee_count integer not null default 0 check (active_employee_count >= 0),
  period_start timestamptz not null,
  period_end timestamptz not null,
  status public.invoice_status not null default 'draft',
  due_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index subscription_invoices_org_idx
  on public.subscription_invoices (organization_id, created_at desc);

create index subscription_invoices_open_idx
  on public.subscription_invoices (status, due_at)
  where status = 'open';

create table public.billplz_bills (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  billplz_bill_id text not null unique,
  billplz_url text not null,
  state public.billplz_bill_state not null default 'due',
  paid_at timestamptz,
  callback_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index billplz_bills_invoice_idx on public.billplz_bills (invoice_id);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index billing_events_org_idx
  on public.billing_events (organization_id, occurred_at desc);

insert into public.billing_plans (
  tier,
  name,
  base_amount_sen_monthly,
  base_amount_sen_yearly,
  overage_amount_sen,
  included_headcount,
  trial_days
)
values
  ('core', 'Core', 6900, 69000, 600, 10, 14),
  ('professional', 'Professional', 12900, 129000, 1200, 10, 14),
  ('enterprise', 'Enterprise', 17900, 179000, 1700, 10, 14)
on conflict (tier) do nothing;

create or replace function public.current_user_owner_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_memberships
  where user_id = auth.uid()
    and 'organization_owner' = any(roles);
$$;

alter table public.billing_plans enable row level security;
alter table public.organization_billing_subscriptions enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.billplz_bills enable row level security;
alter table public.billing_events enable row level security;

create policy billing_plans_read on public.billing_plans
  for select using (auth.uid() is not null);

create policy organization_billing_subscriptions_owner_read on public.organization_billing_subscriptions
  for select using (organization_id in (select public.current_user_owner_org_ids()));

create policy subscription_invoices_owner_read on public.subscription_invoices
  for select using (organization_id in (select public.current_user_owner_org_ids()));

create policy billplz_bills_owner_read on public.billplz_bills
  for select using (
    invoice_id in (
      select id from public.subscription_invoices
      where organization_id in (select public.current_user_owner_org_ids())
    )
  );

create policy billing_events_owner_read on public.billing_events
  for select using (organization_id in (select public.current_user_owner_org_ids()));
