import {
  announcementMatchesAudience,
  type AnnouncementAudience,
} from "@/lib/announcements/audience";
import { announcementExcerpt } from "@/lib/announcements/sanitize";
import { announcementNotificationHref } from "@/lib/notifications/links";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";
import { queueNotification } from "@/lib/notifications/queue";
import { createAdminClient } from "@/lib/supabase/admin";

type Recipient = {
  userId: string;
  roles: string[];
};

export async function queueAnnouncementPublishedNotifications(input: {
  organizationId: string;
  announcementId: string;
  title: string;
  body?: string;
  audience: AnnouncementAudience;
  postedAt: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("organization_memberships")
    .select("user_id, roles, employee_id")
    .eq("organization_id", input.organizationId);

  if (error || !memberships?.length) return;

  const employeeIds = memberships
    .map((row) => row.employee_id)
    .filter((id): id is string => Boolean(id));

  const employeeMap = new Map<string, { branchId: string | null; departmentId: string | null }>();

  if (employeeIds.length > 0) {
    const { data: employees } = await admin
      .from("employees")
      .select("id, branch_id, department_id")
      .in("id", employeeIds);

    for (const employee of employees ?? []) {
      employeeMap.set(employee.id, {
        branchId: employee.branch_id,
        departmentId: employee.department_id,
      });
    }
  }

  const recipients: Recipient[] = [];

  for (const membership of memberships) {
    if (!membership.user_id) continue;

    const employee = membership.employee_id
      ? employeeMap.get(membership.employee_id)
      : undefined;

    const viewer = {
      branchId: employee?.branchId ?? null,
      departmentId: employee?.departmentId ?? null,
      roles: membership.roles ?? [],
    };

    if (!announcementMatchesAudience(input.audience, viewer)) continue;

    recipients.push({
      userId: membership.user_id,
      roles: membership.roles ?? [],
    });
  }

  const idempotencyBase = `announcement:${input.announcementId}:publish:${input.postedAt}`;
  const message = announcementExcerpt(input.body ?? "", 2000);

  await Promise.all(
    recipients.flatMap((recipient) => {
      const portal = recipient.roles.includes("hr_administrator")
        ? "hr"
        : recipient.roles.includes("manager")
          ? "manager"
          : "employee";
      const href = announcementNotificationHref(input.announcementId, portal);
      const payload = {
        announcementId: input.announcementId,
        title: input.title,
        message,
        href,
      };

      return [
        queueNotification({
          organizationId: input.organizationId,
          recipientUserId: recipient.userId,
          channel: "in_app",
          template: "announcement.published",
          payload,
          idempotencyKey: `${idempotencyBase}:${recipient.userId}:in_app`,
        }),
        queueNotification({
          organizationId: input.organizationId,
          recipientUserId: recipient.userId,
          channel: "email",
          template: "announcement.published",
          payload,
          idempotencyKey: `${idempotencyBase}:${recipient.userId}:email`,
        }),
      ];
    }),
  );

  try {
    await processNotificationOutbox(500, "announcement.published");
  } catch (error) {
    console.error("Announcement email delivery failed:", error);
  }
}
