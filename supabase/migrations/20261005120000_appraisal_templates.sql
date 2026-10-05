-- Performance Appraisal Templates, Sections, Questions, and Review Cycle linking

create table if not exists public.appraisal_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  target_department_id uuid references public.departments(id) on delete set null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  rating_scale jsonb not null default '{"min": 1, "max": 5, "step": 1, "labels": {"1": "Unsatisfactory", "2": "Needs Improvement", "3": "Meets Expectations", "4": "Exceeds Expectations", "5": "Outstanding"}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appraisal_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.appraisal_templates(id) on delete cascade,
  title text not null,
  description text,
  weight_pct numeric(5,2) not null default 0,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appraisal_template_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.appraisal_template_sections(id) on delete cascade,
  title text not null,
  description text,
  question_type text not null default 'rating' check (question_type in ('rating', 'text', 'yes_no')),
  required boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Link review cycles to template and optional department filter
alter table public.review_cycles
  add column if not exists template_id uuid references public.appraisal_templates(id) on delete restrict,
  add column if not exists target_department_id uuid references public.departments(id) on delete set null;

-- Structured responses column for criteria evaluations
alter table public.performance_appraisals
  add column if not exists criteria_responses jsonb not null default '[]'::jsonb;

-- Enable RLS
alter table public.appraisal_templates enable row level security;
alter table public.appraisal_template_sections enable row level security;
alter table public.appraisal_template_questions enable row level security;

-- Policies for tenant isolation
create policy appraisal_templates_org on public.appraisal_templates
  for all using (organization_id in (select public.current_user_org_ids()));

create policy appraisal_template_sections_org on public.appraisal_template_sections
  for all using (
    template_id in (
      select id from public.appraisal_templates where organization_id in (select public.current_user_org_ids())
    )
  );

create policy appraisal_template_questions_org on public.appraisal_template_questions
  for all using (
    section_id in (
      select s.id from public.appraisal_template_sections s
      join public.appraisal_templates t on s.template_id = t.id
      where t.organization_id in (select public.current_user_org_ids())
    )
  );

create index if not exists idx_appraisal_templates_org on public.appraisal_templates(organization_id);
create index if not exists idx_appraisal_template_sections_template on public.appraisal_template_sections(template_id, sort_order);
create index if not exists idx_appraisal_template_questions_section on public.appraisal_template_questions(section_id, sort_order);

grant all on table public.appraisal_templates to authenticated, service_role, anon;
grant all on table public.appraisal_template_sections to authenticated, service_role, anon;
grant all on table public.appraisal_template_questions to authenticated, service_role, anon;
