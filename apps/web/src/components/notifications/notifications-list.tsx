"use client";

import Link from "next/link";

import { formatDateTime } from "@/components/employee/employee-shared";
import { resolveNotificationHref } from "@/lib/notifications/links";
import type { NotificationPortal } from "@/lib/notifications/placeholders";
import { notificationTypeDescriptions } from "@/lib/notifications/placeholders";
import type { NotificationRow } from "@/lib/notifications/types";
import { formatNotificationMessage } from "@/lib/notifications/types";

export function NotificationsList({
  notifications,
  portal,
  placeholderNotifications = [],
}: {
  notifications: NotificationRow[];
  portal: NotificationPortal;
  placeholderNotifications?: NotificationRow[];
}) {
  const showingPlaceholders = notifications.length === 0 && placeholderNotifications.length > 0;
  const rows = showingPlaceholders ? placeholderNotifications : notifications;
  const descriptions = notificationTypeDescriptions[portal];

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">What appears here</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground-muted)]">
          {descriptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
          {showingPlaceholders ? (
            <span>
              Sample notifications{" "}
              <span className="font-normal text-[var(--foreground-muted)]">(shown until you receive real alerts)</span>
            </span>
          ) : (
            <span>Recent ({rows.length})</span>
          )}
        </div>
        <div className="divide-y divide-[var(--border-primary)]">
          {rows.map((row) => {
            const href = showingPlaceholders ? null : resolveNotificationHref(row, portal);
            const content = (
              <>
                <p className="text-sm text-[var(--foreground-primary)]">
                  {formatNotificationMessage(row)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--foreground-muted)]">
                  <span>{formatDateTime(row.createdAt)}</span>
                  {href ? <span className="font-medium text-[var(--accent-primary)]">View details</span> : null}
                </div>
              </>
            );

            if (href) {
              return (
                <Link
                  className="block px-5 py-4 transition-colors hover:bg-[var(--surface-muted)]"
                  href={href}
                  key={row.id}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                className={showingPlaceholders ? "px-5 py-4 opacity-80" : "px-5 py-4"}
                key={row.id}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
