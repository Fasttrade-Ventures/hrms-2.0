-- Phase 3: Shared platform services

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_type text not null,
  requester_employee_id uuid not null references public.employees(id) on delete cascade,
  status public.approval_status not null default 'draft',
  payload jsonb not null default '{}',
  submitted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step_order smallint not null,
  approver_employee_id uuid references public.employees(id) on delete set null,
  status public.approval_status not null default 'pending',
  acted_at timestamptz,
  comment text,
  created_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'in_app')),
  template text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (organization_id, idempotency_key)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create table public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  idempotency_key text not null unique,
  status text not null default 'pending',
  scheduled_for timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table public.file_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  storage_key text not null,
  bucket text not null,
  file_name text not null,
  content_type text not null,
  byte_size bigint not null,
  sha256 text not null,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, storage_key)
);

alter table public.approval_requests enable row level security;
alter table public.approval_steps enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_events enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.file_objects enable row level security;

create policy approval_requests_org on public.approval_requests for all
  using (organization_id in (select public.current_user_org_ids()));

create policy approval_steps_org on public.approval_steps for all
  using (organization_id in (select public.current_user_org_ids()));

create policy notification_outbox_org on public.notification_outbox for all
  using (organization_id in (select public.current_user_org_ids()));

create policy audit_events_org on public.audit_events for select
  using (organization_id in (select public.current_user_org_ids()));

create policy scheduled_jobs_org on public.scheduled_jobs for all
  using (organization_id is null or organization_id in (select public.current_user_org_ids()));

create policy file_objects_org on public.file_objects for all
  using (organization_id in (select public.current_user_org_ids()));

create index idx_audit_org_time on public.audit_events(organization_id, occurred_at desc);
