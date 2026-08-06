import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import type { NotificationRow } from "./types";

export type { NotificationRow } from "./types";
export { formatNotificationMessage } from "./types";

export async function listUserNotifications(): Promise<NotificationRow[]> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_outbox")
    .select("id, template, payload, status, created_at")
    .eq("organization_id", session.membership.organizationId)
    .eq("recipient_user_id", session.user.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    template: row.template,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notification_outbox")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", session.membership.organizationId)
    .eq("recipient_user_id", session.user.id)
    .eq("channel", "in_app")
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markInAppNotificationsRead(): Promise<void> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("organization_id", session.membership.organizationId)
    .eq("recipient_user_id", session.user.id)
    .eq("channel", "in_app")
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}

