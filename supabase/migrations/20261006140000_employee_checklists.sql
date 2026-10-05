-- Joiner and leaver checklists. Templates are org-wide. Tasks belong to one employee.

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('onboarding', 'offboarding')),
  created_at timestamptz not null default now(),
  unique (organization_id, kind)
);

create table if not exists public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  title text not null,
  owner_label text not null default 'HR',
  sort_order integer not null default 0
);

create table if not exists public.employee_checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind text not null check (kind in ('onboarding', 'offboarding')),
  title text not null,
  owner_label text not null default 'HR',
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_checklist_tasks_employee
  on public.employee_checklist_tasks(employee_id, kind);

alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.employee_checklist_tasks enable row level security;

drop policy if exists checklist_templates_org on public.checklist_templates;
create policy checklist_templates_org on public.checklist_templates for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists checklist_template_items_org on public.checklist_template_items;
create policy checklist_template_items_org on public.checklist_template_items for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists employee_checklist_tasks_org on public.employee_checklist_tasks;
create policy employee_checklist_tasks_org on public.employee_checklist_tasks for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
