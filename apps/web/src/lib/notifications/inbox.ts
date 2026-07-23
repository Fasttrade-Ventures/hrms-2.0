import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export type NotificationRow = {
  id: string;
  template: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function listUserNotifications(): Promise<NotificationRow[]> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_outbox")
    .select("id, template, payload, status, created_at")
    .eq("organization_id", getOrganizationId())
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

export function formatNotificationMessage(row: NotificationRow): string {
  if (row.template === "approval.pending") return "A team member submitted a request for your approval.";
  if (row.template === "approval.approve") return "Your request was approved.";
  if (row.template === "approval.reject") return "Your request was rejected.";
  if (row.template === "announcement.published") return String(row.payload.title ?? "New announcement");
  return row.template;
}
