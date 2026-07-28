-- Phase 4: Commercial-grade audit (retention, archive, SIEM, immutability)

alter table public.organizations
  add column if not exists audit_retention_days integer not null default 2555,
  add column if not exists audit_archive_enabled boolean not null default false;

create table if not exists public.audit_event_archives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  storage_key text not null,
  event_count integer not null,
  checksum text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_event_archives_org_idx
  on public.audit_event_archives (organization_id, created_at desc);

create table if not exists public.webhook_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null default 'audit',
  payload jsonb not null default '{}',
  destination_url text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  idempotency_key text not null,
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (organization_id, idempotency_key)
);

create index if not exists webhook_outbox_pending_idx
  on public.webhook_outbox (status, created_at)
  where status = 'pending';

alter table public.audit_event_archives enable row level security;
alter table public.webhook_outbox enable row level security;

create policy audit_event_archives_org on public.audit_event_archives for select
  using (organization_id in (select public.current_user_org_ids()));

create policy webhook_outbox_org on public.webhook_outbox for select
  using (organization_id in (select public.current_user_org_ids()));

create or replace function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  if current_setting('hrms.allow_audit_mutation', true) = 'true' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  raise exception 'audit_events are immutable';
end;
$$;

drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable
  before update or delete on public.audit_events
  for each row execute function public.prevent_audit_event_mutation();

create or replace function public.delete_archived_audit_events(event_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  perform set_config('hrms.allow_audit_mutation', 'true', true);
  delete from public.audit_events where id = any(event_ids);
  get diagnostics deleted_count = row_count;
  perform set_config('hrms.allow_audit_mutation', 'false', true);
  return deleted_count;
end;
$$;
