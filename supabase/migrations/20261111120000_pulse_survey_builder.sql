-- Replace one-question pulse with a full survey builder (templates, runs, invites, answers).

do $$
begin
  if to_regclass('public.pulse_responses') is not null then
    drop policy if exists pulse_responses_org on public.pulse_responses;
  end if;
  if to_regclass('public.pulse_surveys') is not null then
    drop policy if exists pulse_surveys_org on public.pulse_surveys;
  end if;
end $$;

drop table if exists public.pulse_responses;
drop table if exists public.pulse_surveys;

create table if not exists public.pulse_survey_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulse_survey_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.pulse_survey_templates(id) on delete cascade,
  title text not null,
  description text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pulse_survey_template_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.pulse_survey_template_sections(id) on delete cascade,
  title text not null,
  description text,
  question_type text not null check (
    question_type in (
      'rating',
      'enps',
      'yes_no',
      'single_choice',
      'multi_choice',
      'short_text',
      'long_text'
    )
  ),
  required boolean not null default true,
  sort_order smallint not null default 0,
  rating_scale jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pulse_survey_template_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.pulse_survey_template_questions(id) on delete cascade,
  label text not null,
  sort_order smallint not null default 0
);

create table if not exists public.pulse_survey_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.pulse_survey_templates(id) on delete set null,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'open', 'closed')),
  opens_on date not null,
  closes_on date not null,
  branch_id uuid references public.branches(id) on delete set null,
  target_roles text[] not null default '{}',
  target_department_ids uuid[] not null default '{}',
  public_link_enabled boolean not null default false,
  public_token text unique,
  notifications_sent_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_on >= opens_on)
);

create table if not exists public.pulse_survey_run_sections (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pulse_survey_runs(id) on delete cascade,
  title text not null,
  description text,
  sort_order smallint not null default 0,
  source_section_id uuid
);

create table if not exists public.pulse_survey_run_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.pulse_survey_run_sections(id) on delete cascade,
  title text not null,
  description text,
  question_type text not null check (
    question_type in (
      'rating',
      'enps',
      'yes_no',
      'single_choice',
      'multi_choice',
      'short_text',
      'long_text'
    )
  ),
  required boolean not null default true,
  sort_order smallint not null default 0,
  rating_scale jsonb,
  source_question_id uuid
);

create table if not exists public.pulse_survey_run_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.pulse_survey_run_questions(id) on delete cascade,
  label text not null,
  sort_order smallint not null default 0,
  source_choice_id uuid
);

create table if not exists public.pulse_survey_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.pulse_survey_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create table if not exists public.pulse_survey_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.pulse_survey_runs(id) on delete cascade,
  channel text not null check (channel in ('staff', 'link')),
  employee_id uuid references public.employees(id) on delete cascade,
  invitation_id uuid references public.pulse_survey_invitations(id) on delete set null,
  submitted_at timestamptz not null default now(),
  check (
    (channel = 'staff' and employee_id is not null)
    or (channel = 'link' and employee_id is null)
  )
);

create unique index if not exists pulse_survey_responses_staff_unique
  on public.pulse_survey_responses (run_id, employee_id)
  where channel = 'staff' and employee_id is not null;

create table if not exists public.pulse_survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.pulse_survey_responses(id) on delete cascade,
  question_id uuid not null references public.pulse_survey_run_questions(id) on delete cascade,
  score smallint,
  text_value text,
  boolean_value boolean,
  choice_ids uuid[] not null default '{}',
  unique (response_id, question_id)
);

create index if not exists idx_pulse_survey_templates_org on public.pulse_survey_templates(organization_id);
create index if not exists idx_pulse_survey_template_sections_template on public.pulse_survey_template_sections(template_id, sort_order);
create index if not exists idx_pulse_survey_template_questions_section on public.pulse_survey_template_questions(section_id, sort_order);
create index if not exists idx_pulse_survey_runs_org on public.pulse_survey_runs(organization_id, status, opens_on);
create index if not exists idx_pulse_survey_run_sections_run on public.pulse_survey_run_sections(run_id, sort_order);
create index if not exists idx_pulse_survey_invitations_run on public.pulse_survey_invitations(run_id);
create index if not exists idx_pulse_survey_invitations_employee on public.pulse_survey_invitations(employee_id, run_id);
create index if not exists idx_pulse_survey_responses_run on public.pulse_survey_responses(run_id, channel);

alter table public.pulse_survey_templates enable row level security;
alter table public.pulse_survey_template_sections enable row level security;
alter table public.pulse_survey_template_questions enable row level security;
alter table public.pulse_survey_template_choices enable row level security;
alter table public.pulse_survey_runs enable row level security;
alter table public.pulse_survey_run_sections enable row level security;
alter table public.pulse_survey_run_questions enable row level security;
alter table public.pulse_survey_run_choices enable row level security;
alter table public.pulse_survey_invitations enable row level security;
alter table public.pulse_survey_responses enable row level security;
alter table public.pulse_survey_answers enable row level security;

create policy pulse_survey_templates_org on public.pulse_survey_templates for all
  using (organization_id in (select public.current_user_org_ids()));

create policy pulse_survey_template_sections_org on public.pulse_survey_template_sections for all
  using (
    template_id in (
      select id from public.pulse_survey_templates
      where organization_id in (select public.current_user_org_ids())
    )
  );

create policy pulse_survey_template_questions_org on public.pulse_survey_template_questions for all
  using (
    section_id in (
      select s.id from public.pulse_survey_template_sections s
      join public.pulse_survey_templates t on s.template_id = t.id
      where t.organization_id in (select public.current_user_org_ids())
    )
  );

create policy pulse_survey_template_choices_org on public.pulse_survey_template_choices for all
  using (
    question_id in (
      select q.id from public.pulse_survey_template_questions q
      join public.pulse_survey_template_sections s on q.section_id = s.id
      join public.pulse_survey_templates t on s.template_id = t.id
      where t.organization_id in (select public.current_user_org_ids())
    )
  );

create policy pulse_survey_runs_org on public.pulse_survey_runs for all
  using (organization_id in (select public.current_user_org_ids()));

create policy pulse_survey_run_sections_org on public.pulse_survey_run_sections for all
  using (
    run_id in (
      select id from public.pulse_survey_runs
      where organization_id in (select public.current_user_org_ids())
    )
  );

create policy pulse_survey_run_questions_org on public.pulse_survey_run_questions for all
  using (
    section_id in (
      select s.id from public.pulse_survey_run_sections s
      join public.pulse_survey_runs r on s.run_id = r.id
      where r.organization_id in (select public.current_user_org_ids())
    )
  );

create policy pulse_survey_run_choices_org on public.pulse_survey_run_choices for all
  using (
    question_id in (
      select q.id from public.pulse_survey_run_questions q
      join public.pulse_survey_run_sections s on q.section_id = s.id
      join public.pulse_survey_runs r on s.run_id = r.id
      where r.organization_id in (select public.current_user_org_ids())
    )
  );

create policy pulse_survey_invitations_org on public.pulse_survey_invitations for all
  using (organization_id in (select public.current_user_org_ids()));

create policy pulse_survey_responses_org on public.pulse_survey_responses for all
  using (organization_id in (select public.current_user_org_ids()));

create policy pulse_survey_answers_org on public.pulse_survey_answers for all
  using (
    response_id in (
      select id from public.pulse_survey_responses
      where organization_id in (select public.current_user_org_ids())
    )
  );

grant all on table public.pulse_survey_templates to authenticated, service_role;
grant all on table public.pulse_survey_template_sections to authenticated, service_role;
grant all on table public.pulse_survey_template_questions to authenticated, service_role;
grant all on table public.pulse_survey_template_choices to authenticated, service_role;
grant all on table public.pulse_survey_runs to authenticated, service_role;
grant all on table public.pulse_survey_run_sections to authenticated, service_role;
grant all on table public.pulse_survey_run_questions to authenticated, service_role;
grant all on table public.pulse_survey_run_choices to authenticated, service_role;
grant all on table public.pulse_survey_invitations to authenticated, service_role;
grant all on table public.pulse_survey_responses to authenticated, service_role;
grant all on table public.pulse_survey_answers to authenticated, service_role;
