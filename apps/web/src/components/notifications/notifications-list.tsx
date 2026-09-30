"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Megaphone, 
  Bell, 
  Info, 
  Check,
  CheckSquare,
  Clock
} from "lucide-react";

import { EmptyState } from "@hrms/ui";
import { resolveNotificationHref } from "@/lib/notifications/links";
import { 
  type NotificationPortal, 
  notificationTypeDescriptions 
} from "@/lib/notifications/placeholders";
import type { NotificationRow } from "@/lib/notifications/types";
import { formatNotificationMessage } from "@/lib/notifications/types";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notifications/actions";
import { REQUEST_TYPE_LABELS } from "@/lib/approvals/types";
import { HrPagination } from "@/components/hr/hr-ui.client";

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function getNotificationText(row: NotificationRow): { title: string; message: string } {
  if (row.template === "approval.pending") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    return {
      title: `${label} pending approval`,
      message: `${label} request is awaiting your approval.`
    };
  }
  if (row.template === "approval.approve") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    return {
      title: `${label} approved`,
      message: `Your ${label.toLowerCase()} request was approved.`
    };
  }
  if (row.template === "approval.reject") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    return {
      title: `${label} rejected`,
      message: `Your ${label.toLowerCase()} request was rejected.`
    };
  }
  if (row.template === "announcement.published") {
    return {
      title: "New announcement",
      message: String(row.payload.title ?? "A new announcement has been posted.")
    };
  }
  if (row.template === "document_compliance_employee") {
    const documentType = String(row.payload.documentType ?? "document");
    const status = String(row.payload.status ?? "missing");
    const title = status === "expiring" ? "Document expiring" : status === "expired" ? "Document expired" : "Document missing";
    return {
      title,
      message: `Your ${documentType} is ${status}.`
    };
  }
  if (row.template === "document_compliance_hr") {
    const employeeName = String(row.payload.employeeName ?? "Employee");
    const documentType = String(row.payload.documentType ?? "document");
    const status = String(row.payload.status ?? "missing");
    const title = status === "expiring" ? "Document expiring" : status === "expired" ? "Document expired" : "Document missing";
    return {
      title,
      message: `${employeeName}'s ${documentType} is ${status}.`
    };
  }
  if (row.template === "payroll.payslip_available") {
    const year = Number(row.payload.periodYear ?? 0);
    const month = Number(row.payload.periodMonth ?? 0);
    const monthName = month ? new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' }) : "";
    const periodStr = monthName && year ? `${monthName} ${year}` : "";
    return {
      title: "Payslip ready",
      message: periodStr ? `${periodStr} payslip is available.` : "Your payslip is ready."
    };
  }
  if (row.template === "attendance.tardy") {
    const shiftStart = String(row.payload.shiftStart ?? "09:00");
    const graceMinutes = Number(row.payload.graceMinutes ?? 0);
    const graceText = graceMinutes > 0 ? ` (grace ended after ${graceMinutes}m)` : "";
    return {
      title: "Shift tardiness alert",
      message: `You haven't clocked in for today's shift starting at ${shiftStart}${graceText}. Please clock in or submit a late report.`
    };
  }
  return {
    title: "Notification",
    message: formatNotificationMessage(row)
  };
}

const GROUPS = [
  { id: "all", label: "All" },
  { id: "leave", label: "Leave Approvals" },
  { id: "claim", label: "Claim Approvals" },
  { id: "ot", label: "OT Approvals" },
  { id: "document", label: "Document Reminders" },
  { id: "announcement", label: "Announcements" },
] as const;

function getNotificationGroup(row: NotificationRow): string {
  if (row.template.startsWith("approval.")) {
    const requestType = String(row.payload.requestType ?? "");
    if (requestType === "leave") return "leave";
    if (requestType === "claim") return "claim";
    if (requestType === "overtime") return "ot";
  }
  if (row.template.startsWith("document_compliance_")) {
    return "document";
  }
  if (row.template === "announcement.published") {
    return "announcement";
  }
  if (row.template.startsWith("attendance.")) {
    return "attendance";
  }
  return "other";
}

function getGroupIcon(group: string, isActive = false) {
  const iconClass = `h-4 w-4 shrink-0 ${isActive ? "text-white" : ""}`;
  switch (group) {
    case "leave":
      return <Calendar className={`${iconClass} ${!isActive ? "text-emerald-600" : ""}`} />;
    case "claim":
      return <DollarSign className={`${iconClass} ${!isActive ? "text-emerald-600" : ""}`} />;
    case "ot":
      return <FileText className={`${iconClass} ${!isActive ? "text-amber-600" : ""}`} />;
    case "document":
      return <Info className={`${iconClass} ${!isActive ? "text-blue-600" : ""}`} />;
    case "announcement":
      return <Megaphone className={`${iconClass} ${!isActive ? "text-purple-600" : ""}`} />;
    case "attendance":
      return <Clock className={`${iconClass} ${!isActive ? "text-amber-600" : ""}`} />;
    default:
      return <Bell className={`${iconClass} ${!isActive ? "text-[var(--foreground-muted)]" : ""}`} />;
  }
}

export function NotificationsList({
  notifications,
  portal,
  page,
  pageSize,
  total,
  tabCounts,
  activeTab,
  filter = "all",
}: {
  notifications: NotificationRow[];
  portal: NotificationPortal;
  page: number;
  pageSize: number;
  total: number;
  tabCounts: Record<string, number>;
  activeTab: string;
  filter?: string;
}) {
  const [localNotifications, setLocalNotifications] = useState<NotificationRow[]>(notifications);
  const [localTabCounts, setLocalTabCounts] = useState<Record<string, number>>(tabCounts);
  const [isPending, setIsPending] = useState(false);

  // Sync state with parent props when they change
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    setLocalTabCounts(tabCounts);
  }, [tabCounts]);

  const isUnreadOnly = filter === "unread";
  const filteredRows = isUnreadOnly
    ? localNotifications.filter((n) => n.status === "pending")
    : localNotifications;

  const hasUnread = localNotifications.some((n) => n.status === "pending");

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, page - 2), pageCount - 4);
    return start + index;
  });

  const filterQuery = isUnreadOnly ? "&filter=unread" : "";
  const baseHref = `/${portal}/notifications`;

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "sent" } : n))
    );
    setLocalTabCounts((prev) => {
      const target = localNotifications.find((n) => n.id === id);
      if (!target || target.status !== "pending") return prev;
      const group = getNotificationGroup(target);
      return {
        ...prev,
        all: Math.max(0, (prev.all ?? 0) - 1),
        [group]: Math.max(0, (prev[group] ?? 0) - 1),
      };
    });

    try {
      await markNotificationReadAction(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      // Revert state on error
      setLocalNotifications(notifications);
      setLocalTabCounts(tabCounts);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isPending) return;
    setIsPending(true);

    // Optimistic update
    setLocalNotifications((prev) =>
      prev.map((n) => ({ ...n, status: "sent" }))
    );
    setLocalTabCounts({
      all: 0,
      leave: 0,
      claim: 0,
      ot: 0,
      document: 0,
      announcement: 0,
    });

    try {
      await markAllNotificationsReadAction();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      // Revert state on error
      setLocalNotifications(notifications);
      setLocalTabCounts(tabCounts);
    } finally {
      setIsPending(false);
    }
  };

  const handleItemClick = async (e: React.MouseEvent, row: NotificationRow) => {
    if (row.status === "pending") {
      // Mark read optimistically
      await handleMarkAsRead(row.id);
    }
  };

  const descriptions = notificationTypeDescriptions[portal];

  return (
    <div className="space-y-6">
      {/* What appears here description card */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">What appears here</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground-muted)]">
          {descriptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Navigation Grouping Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-primary)] pb-1.5 overflow-x-auto select-none no-scrollbar">
        {GROUPS.map((group) => {
          const count = localTabCounts[group.id] ?? 0;
          const isActive = activeTab === group.id;
          return (
            <Link
              key={group.id}
              href={`${baseHref}?tab=${group.id}&page=1${filterQuery}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {group.id !== "all" && getGroupIcon(group.id, isActive)}
              <span>{group.label}</span>
              <span
                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main Notifications Card */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
          <div className="flex items-center gap-3">
            <span>
              {activeTab === "all" ? "Recent" : GROUPS.find((g) => g.id === activeTab)?.label} ({isUnreadOnly ? (localTabCounts[activeTab] ?? filteredRows.length) : total})
            </span>

            <div className="inline-flex rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-0.5 text-xs font-medium">
              <Link
                href={`${baseHref}?tab=${activeTab}&page=1&filter=all`}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  !isUnreadOnly
                    ? "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)] font-semibold shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
                }`}
              >
                All
              </Link>
              <Link
                href={`${baseHref}?tab=${activeTab}&page=1&filter=unread`}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  isUnreadOnly
                    ? "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)] font-semibold shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
                }`}
              >
                Unread only
              </Link>
            </div>
          </div>

          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-[var(--border-primary)]">
          {filteredRows.length === 0 ? (
            <EmptyState
              description="You're all caught up! No notifications in this category."
              icon={<Bell className="h-6 w-6" />}
              title="No notifications found"
              variant="flat"
            />
          ) : (
            filteredRows.map((row) => {
              const href = resolveNotificationHref(row, portal);
              const isUnread = row.status === "pending";
              const group = getNotificationGroup(row);
              const { title, message } = getNotificationText(row);

              const content = (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Status Dot */}
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isUnread ? "bg-[var(--accent-primary)]" : "bg-zinc-200"
                      }`}
                    />

                    {/* Icon wrapper */}
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isUnread ? "bg-white" : "bg-[var(--surface-muted)]"
                      }`}
                    >
                      {getGroupIcon(group)}
                    </div>

                    {/* Text stack */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm text-[var(--foreground-primary)] leading-normal ${
                          isUnread ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {title}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)] leading-normal mt-0.5 break-words">
                        {message}
                      </p>
                    </div>
                  </div>

                  {/* Right side: time and action */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-[var(--foreground-muted)] whitespace-nowrap">
                      {formatRelativeTime(row.createdAt)}
                    </span>

                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkAsRead(row.id);
                        }}
                        className="flex h-7 items-center justify-center rounded bg-[var(--surface-accent-soft)] px-2.5 text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--surface-accent-soft)]/80 transition cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              );

              if (href) {
                return (
                  <Link
                    className={`block px-5 py-3 transition-colors ${
                      isUnread
                        ? "bg-[var(--surface-accent-soft)] hover:bg-[var(--surface-accent-soft)]/80"
                        : "bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]/40"
                    }`}
                    href={href}
                    key={row.id}
                    onClick={(e) => handleItemClick(e, row)}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  className={`px-5 py-3 transition-colors ${
                    isUnread
                      ? "cursor-pointer bg-[var(--surface-accent-soft)] hover:bg-[var(--surface-accent-soft)]/80"
                      : ""
                  }`}
                  key={row.id}
                  onClick={(e) => handleItemClick(e, row)}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="border-t border-[var(--border-primary)] bg-[var(--surface-muted)]/20 px-4 py-3">
            <HrPagination
              from={from}
              itemLabel="notifications"
              nextHref={
                page < pageCount ? `${baseHref}?tab=${activeTab}&page=${page + 1}${filterQuery}` : undefined
              }
              page={page}
              pageLinks={pages.map((pageNumber) => ({
                page: pageNumber,
                href: `${baseHref}?tab=${activeTab}&page=${pageNumber}${filterQuery}`,
              }))}
              prevHref={page > 1 ? `${baseHref}?tab=${activeTab}&page=${page - 1}${filterQuery}` : undefined}
              to={to}
              total={total}
            />
          </div>
        )}
      </div>
    </div>
  );
}
