import { NotificationsList } from "@/components/notifications/notifications-list";
import { requireRole } from "@/lib/auth/session";
import { getPlaceholderNotifications } from "@/lib/notifications/placeholders";
import { getNotificationTabCounts, listUserNotifications, markInAppNotificationsRead } from "@/lib/notifications/inbox";

interface PageProps {
  searchParams: Promise<{ page?: string; tab?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  await requireRole("manager");
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
        placeholderNotifications={getPlaceholderNotifications("manager")}
        portal="manager"
        tabCounts={counts}
        total={notificationsResult.total}
      />
    </div>
  );
}
