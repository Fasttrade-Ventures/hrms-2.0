alter table public.checklist_template_items
  add column if not exists description text not null default '';

alter table public.employee_checklist_tasks
  add column if not exists description text not null default '';
