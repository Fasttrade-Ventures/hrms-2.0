import { createAdminClient } from "@/lib/supabase/admin";

type QueueNotificationInput = {
  organizationId: string;
  recipientUserId: string | null;
  channel: "email" | "in_app";
  template: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export async function queueNotification(input: QueueNotificationInput): Promise<void> {
  if (!input.recipientUserId) return;

  try {
    const admin = createAdminClient();
    await admin.from("notification_outbox").upsert(
      {
        organization_id: input.organizationId,
        recipient_user_id: input.recipientUserId,
        channel: input.channel,
        template: input.template,
        payload: input.payload,
        status: "pending",
        idempotency_key: input.idempotencyKey,
      },
      { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true },
    );
  } catch {
    // Notifications must not block primary flows.
  }
}
