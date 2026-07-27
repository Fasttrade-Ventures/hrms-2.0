create table public.required_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  requires_expiry boolean not null default true,
  warning_days integer not null default 30,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.required_documents enable row level security;

create policy required_documents_org on public.required_documents
  for all using (organization_id in (select public.current_user_org_ids()));

create index idx_required_documents_org_active
  on public.required_documents (organization_id, is_active, sort_order);
