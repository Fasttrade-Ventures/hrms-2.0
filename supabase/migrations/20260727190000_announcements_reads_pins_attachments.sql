-- Announcements: pin to dashboards, multiple attachments, read receipts

alter table public.announcements
  add column if not exists is_pinned boolean not null default false;

create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  file_id uuid not null references public.file_objects(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (announcement_id, file_id)
);

insert into public.announcement_attachments (organization_id, announcement_id, file_id, sort_order)
select organization_id, id, attachment_file_id, 0
from public.announcements
where attachment_file_id is not null
on conflict do nothing;

create table if not exists public.announcement_reads (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index if not exists announcement_reads_user_idx
  on public.announcement_reads (user_id, read_at desc);

create index if not exists announcements_pinned_idx
  on public.announcements (organization_id, is_pinned)
  where is_pinned = true;

alter table public.announcement_attachments enable row level security;
alter table public.announcement_reads enable row level security;

create policy announcement_attachments_org on public.announcement_attachments
  for all using (organization_id in (select public.current_user_org_ids()));

create policy announcement_reads_org on public.announcement_reads
  for all using (organization_id in (select public.current_user_org_ids()));
