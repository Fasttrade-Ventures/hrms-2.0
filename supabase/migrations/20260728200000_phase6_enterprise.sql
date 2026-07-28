-- Phase 6: Enterprise tier (integrations, API, payouts, recruitment)

alter type public.employee_status add value if not exists 'draft';

-- Webhook registry
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  url text not null,
  secret text not null default '',
  events_filter text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_endpoints_org_idx
  on public.webhook_endpoints (organization_id, status);

alter table public.webhook_outbox
  add column if not exists endpoint_id uuid references public.webhook_endpoints(id) on delete set null;

-- Migrate legacy SIEM integration_connections into webhook_endpoints
insert into public.webhook_endpoints (organization_id, name, url, secret, events_filter, status)
select
  ic.organization_id,
  'SIEM (migrated)',
  coalesce(ic.config->>'url', ''),
  coalesce(ic.config->>'secret', ''),
  coalesce(
    (
      select array_agg(value)
      from jsonb_array_elements_text(coalesce(ic.config->'eventsFilter', '[]'::jsonb)) as value
    ),
    '{}'::text[]
  ),
  case when ic.status = 'active' and coalesce(ic.config->>'url', '') <> '' then 'active' else 'inactive' end
from public.integration_connections ic
where ic.provider = 'siem'
  and not exists (
    select 1 from public.webhook_endpoints we
    where we.organization_id = ic.organization_id and we.name = 'SIEM (migrated)'
  );

-- API keys
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default array['employees:read', 'leave:read', 'payroll:read'],
  created_by_user_id uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_org_idx on public.api_keys (organization_id);
create unique index if not exists api_keys_hash_idx on public.api_keys (key_hash) where revoked_at is null;

-- Payout reconciliation
create table if not exists public.payrun_payout_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payrun_id uuid not null references public.payroll_payruns(id) on delete cascade,
  bank_format text not null default 'bank_csv',
  status text not null default 'pending' check (status in ('pending', 'submitted', 'reconciled')),
  submitted_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (payrun_id)
);

create table if not exists public.payrun_payout_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.payrun_payout_batches(id) on delete cascade,
  payrun_item_id uuid not null references public.payroll_payrun_items(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  reference text not null,
  amount numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'paid', 'failed')),
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_id, payrun_item_id)
);

create index if not exists payrun_payout_items_batch_status_idx
  on public.payrun_payout_items (batch_id, status);

create table if not exists public.payout_reconciliation_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.payrun_payout_batches(id) on delete cascade,
  file_path text not null,
  parsed_rows integer not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Recruitment
create table if not exists public.job_requisitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  department_id uuid references public.departments(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  headcount smallint not null default 1 check (headcount > 0),
  employment_type text,
  status text not null default 'open' check (status in ('open', 'on_hold', 'closed')),
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requisition_id uuid not null references public.job_requisitions(id) on delete cascade,
  candidate_id uuid not null references public.job_candidates(id) on delete cascade,
  stage text not null default 'applied' check (
    stage in ('applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected', 'withdrawn')
  ),
  employee_id uuid references public.employees(id) on delete set null,
  applied_at timestamptz not null default now(),
  stage_updated_at timestamptz not null default now(),
  unique (requisition_id, candidate_id)
);

create index if not exists job_applications_requisition_stage_idx
  on public.job_applications (requisition_id, stage);

create table if not exists public.job_application_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.job_applications(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.job_applications(id) on delete cascade,
  job_title text not null,
  basic_salary numeric(12, 2) not null default 0,
  start_date date not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'withdrawn')),
  generated_file_id uuid references public.file_objects(id) on delete set null,
  signed_file_id uuid references public.file_objects(id) on delete set null,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id)
);

-- RLS
alter table public.webhook_endpoints enable row level security;
alter table public.api_keys enable row level security;
alter table public.payrun_payout_batches enable row level security;
alter table public.payrun_payout_items enable row level security;
alter table public.payout_reconciliation_uploads enable row level security;
alter table public.job_requisitions enable row level security;
alter table public.job_candidates enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_application_stage_history enable row level security;
alter table public.job_offers enable row level security;

create policy webhook_endpoints_org on public.webhook_endpoints for all
  using (organization_id in (select public.current_user_org_ids()));

create policy api_keys_org on public.api_keys for all
  using (organization_id in (select public.current_user_org_ids()));

create policy payrun_payout_batches_org on public.payrun_payout_batches for all
  using (organization_id in (select public.current_user_org_ids()));

create policy payrun_payout_items_org on public.payrun_payout_items for all
  using (organization_id in (select public.current_user_org_ids()));

create policy payout_reconciliation_uploads_org on public.payout_reconciliation_uploads for all
  using (organization_id in (select public.current_user_org_ids()));

create policy job_requisitions_org on public.job_requisitions for all
  using (organization_id in (select public.current_user_org_ids()));

create policy job_candidates_org on public.job_candidates for all
  using (organization_id in (select public.current_user_org_ids()));

create policy job_applications_org on public.job_applications for all
  using (organization_id in (select public.current_user_org_ids()));

create policy job_application_stage_history_org on public.job_application_stage_history for all
  using (organization_id in (select public.current_user_org_ids()));

create policy job_offers_org on public.job_offers for all
  using (organization_id in (select public.current_user_org_ids()));
