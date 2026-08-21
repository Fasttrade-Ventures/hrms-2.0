-- Add geofence_outside_action column to branches table
alter table public.branches
  add column if not exists geofence_outside_action text not null default 'flag'
  check (geofence_outside_action in ('flag', 'block'));
