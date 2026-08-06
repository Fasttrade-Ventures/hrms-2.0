-- Add attachment_file_id column to leave_requests table
alter table public.leave_requests
  add column if not exists attachment_file_id uuid references public.file_objects(id) on delete set null;
