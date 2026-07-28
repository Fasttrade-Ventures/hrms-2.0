alter table public.review_cycles
  add column if not exists closed_at timestamptz;
