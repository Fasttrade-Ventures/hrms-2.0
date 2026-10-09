-- Multi-level sequential approvals, workflow definitions, and timeout escalation rules

-- 1. Department head reference for department-level approval routing (unconstrained UUID to avoid PostgREST circular embedding ambiguity)
alter table public.departments
  add column if not exists head_employee_id uuid;

-- 2. Approval workflow definitions per organization and request type
create table if not exists public.approval_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_type text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, request_type)
);

-- 3. Multi-stage steps configuration within an approval workflow
create table if not exists public.approval_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.approval_workflows(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step_order smallint not null,
  step_label text not null default 'Approval',
  approver_type text not null check (approver_type in ('manager', 'department_head', 'specific_employee', 'hr_admin')),
  specific_employee_id uuid references public.employees(id) on delete set null,
  timeout_days integer,
  escalation_action text not null default 'none' check (escalation_action in ('none', 'escalate_to_manager_of_manager', 'escalate_to_hr', 'escalate_to_employee')),
  escalation_employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);

-- 4. Enrich approval_steps table with labels, deadlines, and escalation tracking
alter table public.approval_steps
  add column if not exists step_label text,
  add column if not exists timeout_days integer,
  add column if not exists due_date timestamptz,
  add column if not exists is_escalated boolean not null default false,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_from_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists escalation_action text default 'none',
  add column if not exists escalation_employee_id uuid references public.employees(id) on delete set null;

-- 5. Enable Row Level Security and Org Policies
alter table public.approval_workflows enable row level security;
alter table public.approval_workflow_steps enable row level security;

create policy approval_workflows_org on public.approval_workflows for all
  using (organization_id in (select public.current_user_org_ids()));

create policy approval_workflow_steps_org on public.approval_workflow_steps for all
  using (organization_id in (select public.current_user_org_ids()));

-- 6. Indexes for escalation lookups and workflow step queries
create index if not exists idx_approval_workflow_lookup on public.approval_workflows(organization_id, request_type, is_active);
create index if not exists idx_approval_workflow_steps_order on public.approval_workflow_steps(workflow_id, step_order);
create index if not exists idx_approval_steps_due_escalation on public.approval_steps(organization_id, status, due_date) where status = 'pending';

-- 7. Permissions
grant all on public.approval_workflows to authenticated, service_role, anon;
grant all on public.approval_workflow_steps to authenticated, service_role, anon;
