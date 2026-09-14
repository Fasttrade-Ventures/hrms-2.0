-- Migration: Attendance auto clock-out support
-- Adds is_auto_clock_out column and index for efficient unclosed session lookups

alter table public.attendance_records
  add column if not exists is_auto_clock_out boolean not null default false;

create index if not exists idx_attendance_records_open
  on public.attendance_records (organization_id, clock_out_at)
  where clock_out_at is null;
