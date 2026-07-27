import { NotificationsList } from "@/components/notifications/notifications-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getPlaceholderNotifications } from "@/lib/notifications/placeholders";
import { listUserNotifications, markInAppNotificationsRead } from "@/lib/notifications/inbox";

export default async function HrNotificationsPage() {
  await requireRole("hr_administrator");
  await markInAppNotificationsRead().catch(() => undefined);
  const notifications = await listUserNotifications().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Document compliance alerts, approval activity, and org updates. Open this page from the bell icon in the header."
        title="Notifications"
      />
      <NotificationsList
        notifications={notifications}
        placeholderNotifications={getPlaceholderNotifications("hr")}
        portal="hr"
      />
    </div>
  );
}
