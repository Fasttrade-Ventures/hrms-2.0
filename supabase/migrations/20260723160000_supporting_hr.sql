-- Phase 7: Supporting HR (documents, assets, announcements, performance)

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text not null,
  posted_at timestamptz not null default now(),
  display_from date,
  display_until date,
  branch_id uuid references public.branches(id) on delete set null,
  target_roles text[] not null default '{}',
  attachment_file_id uuid references public.file_objects(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.document_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  parent_id uuid references public.document_folders(id) on delete cascade,
  access_roles text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  folder_id uuid references public.document_folders(id) on delete set null,
  document_type text not null,
  file_id uuid not null references public.file_objects(id) on delete restrict,
  expires_at date,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  serial_number text,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  issued_at date,
  returned_at date,
  created_at timestamptz not null default now()
);

create table public.review_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  created_at timestamptz not null default now()
);

create table public.performance_appraisals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  review_cycle_id uuid not null references public.review_cycles(id) on delete cascade,
  self_rating smallint,
  self_comments text,
  manager_rating smallint,
  manager_comments text,
  status public.approval_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
alter table public.document_folders enable row level security;
alter table public.employee_documents enable row level security;
alter table public.assets enable row level security;
alter table public.review_cycles enable row level security;
alter table public.performance_appraisals enable row level security;

create policy announcements_org on public.announcements for all using (organization_id in (select public.current_user_org_ids()));
create policy document_folders_org on public.document_folders for all using (organization_id in (select public.current_user_org_ids()));
create policy employee_documents_org on public.employee_documents for all using (organization_id in (select public.current_user_org_ids()));
create policy assets_org on public.assets for all using (organization_id in (select public.current_user_org_ids()));
create policy review_cycles_org on public.review_cycles for all using (organization_id in (select public.current_user_org_ids()));
create policy performance_appraisals_org on public.performance_appraisals for all using (organization_id in (select public.current_user_org_ids()));
