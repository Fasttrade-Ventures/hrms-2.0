import { shouldSendAnnouncementNotifications } from "@/lib/announcements/schedule";
import { queueAnnouncementPublishedNotifications } from "@/lib/announcements/publish-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runScheduledAnnouncementNotificationsJob(asOf: string): Promise<number> {
  const admin = createAdminClient();

  const { data: announcements, error } = await admin
    .from("announcements")
    .select(
      "id, organization_id, title, status, posted_at, display_from, branch_id, target_roles, target_department_ids, notifications_sent_at",
    )
    .eq("status", "published")
    .is("notifications_sent_at", null);

  if (error) throw new Error(error.message);

  let sent = 0;

  for (const announcement of announcements ?? []) {
    if (
      !shouldSendAnnouncementNotifications(
        {
          status: announcement.status,
          displayFrom: announcement.display_from,
          notificationsSentAt: announcement.notifications_sent_at,
        },
        asOf,
      )
    ) {
      continue;
    }

    if (!announcement.posted_at) continue;

    await queueAnnouncementPublishedNotifications({
      organizationId: announcement.organization_id,
      announcementId: announcement.id,
      title: announcement.title,
      audience: {
        branchId: announcement.branch_id,
        targetRoles: announcement.target_roles ?? [],
        targetDepartmentIds: announcement.target_department_ids ?? [],
      },
      postedAt: announcement.posted_at,
    });

    const { error: updateError } = await admin
      .from("announcements")
      .update({ notifications_sent_at: new Date().toISOString() })
      .eq("id", announcement.id);

    if (updateError) throw new Error(updateError.message);
    sent += 1;
  }

  return sent;
}
