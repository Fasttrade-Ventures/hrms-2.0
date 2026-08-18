import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { syncEmployeeDocumentCompliance } from "@/lib/hr/scan-document-compliance";

import type { NotificationRow } from "./types";

export type { NotificationRow } from "./types";
export { formatNotificationMessage } from "./types";

export async function listUserNotifications(
  tab = "all",
  page = 1,
  pageSize = 5,
): Promise<{
  notifications: NotificationRow[];
  total: number;
}> {
  const session = await requireAuth();

  if (session.membership.employeeId) {
    await syncEmployeeDocumentCompliance(
      session.membership.organizationId,
      session.membership.employeeId,
      session.user.id,
      session.user.fullName || session.user.email || "Employee"
    ).catch((err) => {
      console.error("Failed to sync employee document compliance:", err);
    });
  }

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("notification_outbox")
    .select("id, template, payload, status, created_at", { count: "exact" })
    .eq("organization_id", session.membership.organizationId)
    .eq("recipient_user_id", session.user.id)
    .eq("channel", "in_app");

  if (tab === "leave") {
    query = query.like("template", "approval.%").eq("payload->>requestType", "leave");
  } else if (tab === "claim") {
    query = query.like("template", "approval.%").eq("payload->>requestType", "claim");
  } else if (tab === "ot") {
    query = query.like("template", "approval.%").eq("payload->>requestType", "overtime");
  } else if (tab === "document") {
    query = query.like("template", "document_compliance_%");
  } else if (tab === "announcement") {
    query = query.eq("template", "announcement.published");
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const notifications = (data ?? []).map((row) => ({
    id: row.id,
    template: row.template,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status,
    createdAt: row.created_at,
  }));

  return {
    notifications,
    total: count ?? 0,
  };
}

export async function getNotificationTabCounts(): Promise<Record<string, number>> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_outbox")
    .select("template, payload")
    .eq("organization_id", session.membership.organizationId)
    .eq("recipient_user_id", session.user.id)
    .eq("channel", "in_app");

  if (error) throw new Error(error.message);

  const counts = {
    all: data.length,
    leave: 0,
    claim: 0,
    ot: 0,
    document: 0,
    announcement: 0,
  };

  for (const row of data) {
    const template = row.template;
    const payload = (row.payload ?? {}) as Record<string, unknown>;

    if (template.startsWith("approval.")) {
      const requestType = String(payload.requestType ?? "");
      if (requestType === "leave") counts.leave += 1;
      else if (requestType === "claim") counts.claim += 1;
      else if (requestType === "overtime") counts.ot += 1;
    } else if (template.startsWith("document_compliance_")) {
      counts.document += 1;
    } else if (template === "announcement.published") {
      counts.announcement += 1;
    }
  }

  return counts;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await requireAuth();

  if (session.membership.employeeId) {
    await syncEmployeeDocumentCompliance(
      session.membership.organizationId,
      session.membership.employeeId,
      session.user.id,
      session.user.fullName || session.user.email || "Employee"
    ).catch((err) => {
      console.error("Failed to sync employee document compliance:", err);
    });
  }

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

