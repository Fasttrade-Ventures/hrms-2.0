import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { listUserNotifications } from "@/lib/notifications/inbox";

export default async function Page() {
  const notifications = await listUserNotifications().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="In-app and email notifications." title="Notifications" />
      <NotificationsList notifications={notifications} />
    </div>
  );
}
