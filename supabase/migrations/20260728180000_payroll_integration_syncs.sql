create table if not exists public.payroll_integration_syncs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payrun_id uuid not null references public.payroll_payruns(id) on delete cascade,
  provider text not null default 'bukucloud',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  external_journal_id text,
  reference_number text,
  last_error text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, payrun_id, provider)
);

create index if not exists payroll_integration_syncs_org_idx
  on public.payroll_integration_syncs (organization_id, created_at desc);

alter table public.payroll_integration_syncs enable row level security;

create policy payroll_integration_syncs_org on public.payroll_integration_syncs for all
  using (organization_id in (select public.current_user_org_ids()));
