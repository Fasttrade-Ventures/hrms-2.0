import Link from "next/link";

import { formatDateTime } from "@/components/employee/employee-shared";
import { Badge } from "@/components/ui/badge";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { AnnouncementListItem } from "@/components/announcements/announcement-list";

export function AnnouncementDashboardWidget({
  pinnedItems,
  items,
  basePath,
}: {
  pinnedItems: AnnouncementListItem[];
  items: AnnouncementListItem[];
  basePath: "/employee/announcements" | "/manager/announcements" | "/hr/announcements";
}) {
  const detailHref = (id: string) =>
    basePath === "/hr/announcements" ? `${basePath}?view=${id}` : `${basePath}/${id}`;

  function renderItem(item: AnnouncementListItem) {
    return (
      <li key={item.id}>
        <Link
          className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/30"
          href={detailHref(item.id)}
        >
          <div className="flex items-center gap-2">
            {!item.isRead ? <span className="size-2 rounded-full bg-primary" /> : null}
            <p className="font-medium text-foreground">{item.title}</p>
            {item.isPinned ? <Badge variant="outline">Pinned</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(item.postedAt ?? item.displayFrom ?? "")}
          </p>
        </Link>
      </li>
    );
  }

  const hasContent = pinnedItems.length > 0 || items.length > 0;

  return (
    <PortalSectionCard
      action={
        <Link className="text-sm font-medium text-primary hover:underline" href={basePath}>
          View all
        </Link>
      }
      description="Pinned updates and latest company news."
      title="Announcements"
    >
      {!hasContent ? (
        <p className="text-sm text-muted-foreground">No announcements right now.</p>
      ) : (
        <div className="space-y-4">
          {pinnedItems.length > 0 ? (
            <ul className="space-y-2">{pinnedItems.map(renderItem)}</ul>
          ) : null}
          {items.length > 0 ? (
            <ul className="space-y-2">{items.map(renderItem)}</ul>
          ) : null}
        </div>
      )}
    </PortalSectionCard>
  );
}
