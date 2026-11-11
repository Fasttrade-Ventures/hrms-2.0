alter table public.organizations
  add column if not exists letterhead_file_id uuid references public.file_objects(id) on delete set null;
alter table public.hr_letter_templates
  add column if not exists letterhead_file_id uuid references public.file_objects(id) on delete set null;
