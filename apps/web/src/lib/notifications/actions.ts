"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_user_id", session.user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/employee/notifications");
  revalidatePath("/manager/notifications");
  revalidatePath("/hr/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("recipient_user_id", session.user.id)
    .eq("channel", "in_app")
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  revalidatePath("/employee/notifications");
  revalidatePath("/manager/notifications");
  revalidatePath("/hr/notifications");
}
