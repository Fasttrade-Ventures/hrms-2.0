import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { listUserNotifications } from "@/lib/notifications/inbox";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const notifications = await listUserNotifications().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="In-app notifications for approvals and updates." title="Notifications" />
      <NotificationsList notifications={notifications} />
    </div>
  );
}
