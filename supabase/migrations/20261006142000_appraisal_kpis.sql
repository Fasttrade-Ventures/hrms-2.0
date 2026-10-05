create table if not exists public.appraisal_template_kpis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.appraisal_templates(id) on delete cascade,
  name text not null,
  weight numeric not null check (weight > 0 and weight <= 100),
  target text,
  sort_order integer not null default 0
);

create table if not exists public.appraisal_kpi_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appraisal_id uuid not null references public.performance_appraisals(id) on delete cascade,
  kpi_id uuid not null references public.appraisal_template_kpis(id) on delete cascade,
  employee_score numeric,
  manager_score numeric,
  unique (appraisal_id, kpi_id)
);

alter table public.appraisal_template_kpis enable row level security;
alter table public.appraisal_kpi_scores enable row level security;

drop policy if exists appraisal_template_kpis_org on public.appraisal_template_kpis;
create policy appraisal_template_kpis_org on public.appraisal_template_kpis for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists appraisal_kpi_scores_org on public.appraisal_kpi_scores;
create policy appraisal_kpi_scores_org on public.appraisal_kpi_scores for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
