"use server";

import { revalidatePath } from "next/cache";

import { markAnnouncementRead } from "@/lib/announcements/reads";
import { requireAuth } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export async function markAnnouncementReadAction(announcementId: string): Promise<void> {
  requireModule("announcements");
  const session = await requireAuth();
  await markAnnouncementRead({
    announcementId,
    userId: session.user.id,
  });
  revalidatePath("/employee/announcements");
  revalidatePath("/employee/dashboard");
  revalidatePath("/manager/announcements");
  revalidatePath("/manager/dashboard");
  revalidatePath(`/employee/announcements/${announcementId}`);
  revalidatePath(`/manager/announcements/${announcementId}`);
}
