import { NotificationsList } from "@/components/notifications/notifications-list";
import { requireRole } from "@/lib/auth/session";
import { getPlaceholderNotifications } from "@/lib/notifications/placeholders";
import { getNotificationTabCounts, listUserNotifications, markInAppNotificationsRead } from "@/lib/notifications/inbox";

interface PageProps {
  searchParams: Promise<{ page?: string; tab?: string }>;
}

export default async function HrNotificationsPage({ searchParams }: PageProps) {
  await requireRole("hr_administrator");
  await markInAppNotificationsRead().catch(() => undefined);

  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const tab = params.tab ?? "all";

  const [notificationsResult, counts] = await Promise.all([
    listUserNotifications(tab, page, 5),
    getNotificationTabCounts(),
  ]);

  return (
    <div className="space-y-6">
      <NotificationsList
        activeTab={tab}
        notifications={notificationsResult.notifications}
        page={page}
        pageSize={5}
        placeholderNotifications={getPlaceholderNotifications("hr")}
        portal="hr"
        tabCounts={counts}
        total={notificationsResult.total}
      />
    </div>
  );
}
