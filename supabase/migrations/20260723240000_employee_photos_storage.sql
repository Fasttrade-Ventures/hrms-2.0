-- Public bucket for employee profile photos (avatars).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-photos',
  'employee-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists employee_photos_public_read on storage.objects;
create policy employee_photos_public_read on storage.objects
  for select
  using (bucket_id = 'employee-photos');
