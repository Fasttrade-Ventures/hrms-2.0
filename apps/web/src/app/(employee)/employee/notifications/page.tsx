import { NotificationsList } from "@/components/notifications/notifications-list";
import { getPlaceholderNotifications } from "@/lib/notifications/placeholders";
import { getNotificationTabCounts, listUserNotifications } from "@/lib/notifications/inbox";

interface PageProps {
  searchParams: Promise<{ page?: string; tab?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
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
        placeholderNotifications={getPlaceholderNotifications("employee")}
        portal="employee"
        tabCounts={counts}
        total={notificationsResult.total}
      />
    </div>
  );
}
