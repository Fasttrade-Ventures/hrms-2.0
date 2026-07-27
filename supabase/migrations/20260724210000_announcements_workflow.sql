-- Announcements workflow: drafts, department targeting, updated_at

create type public.announcement_status as enum ('draft', 'published');

alter table public.announcements
  add column if not exists status public.announcement_status not null default 'published',
  add column if not exists target_department_ids uuid[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

alter table public.announcements alter column posted_at drop not null;

update public.announcements set status = 'published' where status is null;

create index if not exists announcements_org_status_posted_idx
  on public.announcements (organization_id, status, posted_at desc nulls last);
