import { NotificationsList } from "@/components/notifications/notifications-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getPlaceholderNotifications } from "@/lib/notifications/placeholders";
import { listUserNotifications } from "@/lib/notifications/inbox";

export default async function Page() {
  const notifications = await listUserNotifications().catch(() => []);


  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Alerts from approvals, documents, and company news. Open this page from the bell icon in the header."
        title="Notifications"
      />
      <NotificationsList
        notifications={notifications}
        placeholderNotifications={getPlaceholderNotifications("employee")}
        portal="employee"
      />
    </div>
  );
}
