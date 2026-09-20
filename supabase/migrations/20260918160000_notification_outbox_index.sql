-- Migration: Add compound index to optimize in-app notification queries and inbox feeds
create index if not exists idx_notification_outbox_inbox
  on public.notification_outbox (organization_id, recipient_user_id, channel, status, created_at desc);
