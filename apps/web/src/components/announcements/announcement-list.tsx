import Link from "next/link";

import { formatDateTime } from "@/components/employee/employee-shared";
import { Badge } from "@/components/ui/badge";
import { HrTableCard } from "@/components/hr/hr-ui";

export type AnnouncementListItem = {
  id: string;
  title: string;
  excerpt: string;
  postedAt: string | null;
  displayFrom: string | null;
  isPinned?: boolean;
  isRead?: boolean;
  hasAttachment: boolean;
  attachmentCount?: number;
};

export function AnnouncementList({
  items,
  basePath,
}: {
  items: AnnouncementListItem[];
  basePath: "/employee/announcements" | "/manager/announcements";
}) {
  return (
    <HrTableCard>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <Link
            className={`block px-4 py-4 transition-colors hover:bg-muted/30 ${
              item.isRead ? "opacity-90" : ""
            }`}
            href={`${basePath}/${item.id}`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.isRead ? <Badge variant="default">Unread</Badge> : null}
                  <h2 className="font-medium text-foreground">{item.title}</h2>
                  {item.isPinned ? <Badge variant="outline">Pinned</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <p>{formatDateTime(item.postedAt ?? item.displayFrom ?? "")}</p>
                {item.hasAttachment ? (
                  <p className="mt-1">
                    {item.attachmentCount && item.attachmentCount > 1
                      ? `${item.attachmentCount} attachments`
                      : "Attachment"}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </HrTableCard>
  );
}
