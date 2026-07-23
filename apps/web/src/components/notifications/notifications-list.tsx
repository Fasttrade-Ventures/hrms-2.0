"use client";

import { EmptyState } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalIcon } from "@/components/portal/portal-icons";
import type { NotificationRow } from "@/lib/notifications/inbox";
import { formatNotificationMessage } from "@/lib/notifications/inbox";

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        description="You're all caught up."
        icon={<PortalIcon name="notifications" />}
        title="No notifications"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
        Recent ({notifications.length})
      </div>
      <div className="divide-y divide-[var(--border-primary)]">
        {notifications.map((row) => (
          <div className="px-5 py-4" key={row.id}>
            <p className="text-sm text-[var(--foreground-primary)]">{formatNotificationMessage(row)}</p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">{formatDateTime(row.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
