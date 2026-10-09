alter table public.attendance_records
  add column if not exists source text not null default 'app';
