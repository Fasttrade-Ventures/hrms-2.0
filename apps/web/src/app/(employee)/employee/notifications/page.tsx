import { NotificationsList } from "@/components/notifications/notifications-list";
import { getNotificationTabCounts, listUserNotifications } from "@/lib/notifications/inbox";

interface PageProps {
  searchParams: Promise<{ page?: string; tab?: string; filter?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const tab = params.tab ?? "all";
  const filter = params.filter ?? "all";
  const unreadOnly = filter === "unread";

  const [notificationsResult, counts] = await Promise.all([
    listUserNotifications(tab, page, 10, unreadOnly),
    getNotificationTabCounts(true),
  ]);

  return (
    <div className="space-y-6">
      <NotificationsList
        activeTab={tab}
        filter={filter}
        notifications={notificationsResult.notifications}
        page={page}
        pageSize={10}
        portal="employee"
        tabCounts={counts}
        total={notificationsResult.total}
      />
    </div>
  );
}
