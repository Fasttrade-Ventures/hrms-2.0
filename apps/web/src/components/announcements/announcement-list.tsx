import Link from "next/link";

import { StatusPill } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalCard } from "@/components/portal/portal-card";

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
    <PortalCard className="overflow-hidden" padding="none">
      <div className="divide-y divide-[var(--border-primary)]">
        {items.map((item) => (
          <Link
            className="block px-4 py-4 transition-colors hover:bg-[var(--surface-muted)]/60 sm:px-5"
            href={`${basePath}/${item.id}`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.isRead ? <StatusPill label="Unread" tone="warning" /> : null}
                  {item.isPinned ? <StatusPill label="Pinned" tone="neutral" /> : null}
                  <h2 className="font-medium text-[var(--foreground-primary)]">{item.title}</h2>
                </div>
                <p className="line-clamp-2 text-sm text-[var(--foreground-muted)]">{item.excerpt}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-[var(--foreground-muted)]">
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
    </PortalCard>
  );
}
