alter table public.announcements
  add column if not exists notifications_sent_at timestamptz;
