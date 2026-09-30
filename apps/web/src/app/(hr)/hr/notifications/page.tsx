import { NotificationsList } from "@/components/notifications/notifications-list";
import { requireRole } from "@/lib/auth/session";
import { getNotificationTabCounts, listUserNotifications, markInAppNotificationsRead } from "@/lib/notifications/inbox";

interface PageProps {
  searchParams: Promise<{ page?: string; tab?: string; filter?: string }>;
}

export default async function HrNotificationsPage({ searchParams }: PageProps) {
  await requireRole("hr_administrator");
  await markInAppNotificationsRead().catch(() => undefined);

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
        portal="hr"
        tabCounts={counts}
        total={notificationsResult.total}
      />
    </div>
  );
}
