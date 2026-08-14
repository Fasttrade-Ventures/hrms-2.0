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
  CheckSquare
} from "lucide-react";

import { resolveNotificationHref } from "@/lib/notifications/links";
import type { NotificationPortal } from "@/lib/notifications/placeholders";
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

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
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
  return "other";
}

function getGroupIcon(group: string) {
  switch (group) {
    case "leave":
      return <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />;
    case "claim":
      return <DollarSign className="h-4 w-4 text-emerald-600" />;
    case "ot":
      return <FileText className="h-4 w-4 text-amber-600" />;
    case "document":
      return <Info className="h-4 w-4 text-blue-600" />;
    case "announcement":
      return <Megaphone className="h-4 w-4 text-purple-600" />;
    default:
      return <Bell className="h-4 w-4 text-[var(--foreground-muted)]" />;
  }
}

export function NotificationsList({
  notifications,
  portal,
  placeholderNotifications = [],
  page,
  pageSize,
  total,
  tabCounts,
  activeTab,
}: {
  notifications: NotificationRow[];
  portal: NotificationPortal;
  placeholderNotifications?: NotificationRow[];
  page: number;
  pageSize: number;
  total: number;
  tabCounts: Record<string, number>;
  activeTab: string;
}) {
  const showingPlaceholders = notifications.length === 0 && placeholderNotifications.length > 0;
  const initialRows = showingPlaceholders ? placeholderNotifications : notifications;
  
  const [localNotifications, setLocalNotifications] = useState<NotificationRow[]>(initialRows);
  const [isPending, setIsPending] = useState(false);

  // Sync state with parent props when they change
  useEffect(() => {
    setLocalNotifications(showingPlaceholders ? placeholderNotifications : notifications);
  }, [notifications, placeholderNotifications, showingPlaceholders]);

  const filteredRows = localNotifications;

  const hasUnread = localNotifications.some(n => n.status === "pending");

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, page - 2), pageCount - 4);
    return start + index;
  });

  const baseHref = `/${portal}/notifications`;

  const handleMarkAsRead = async (id: string) => {
    if (showingPlaceholders) return;
    
    // Optimistic update
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, status: "sent" } : n)
    );

    try {
      await markNotificationReadAction(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      // Revert state on error
      setLocalNotifications(showingPlaceholders ? placeholderNotifications : notifications);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (showingPlaceholders) return;
    setIsPending(true);

    // Optimistic update
    setLocalNotifications(prev =>
      prev.map(n => ({ ...n, status: "sent" }))
    );

    try {
      await markAllNotificationsReadAction();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      // Revert state on error
      setLocalNotifications(showingPlaceholders ? placeholderNotifications : notifications);
    } finally {
      setIsPending(false);
    }
  };

  const handleItemClick = async (e: React.MouseEvent, row: NotificationRow) => {
    if (showingPlaceholders) return;

    if (row.status === "pending") {
      // Mark read optimistically
      await handleMarkAsRead(row.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Head */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-[var(--foreground-primary)]">Inbox</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          {portal === "employee" 
            ? "Leave, claims, payslips and system alerts"
            : portal === "manager"
              ? "Approvals, team updates and company announcements"
              : "Document compliance, approvals and system alerts"}
        </p>
      </div>

      {/* Navigation Grouping Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-primary)] pb-1.5 overflow-x-auto select-none no-scrollbar">
        {GROUPS.map((group) => {
          const count = showingPlaceholders ? localNotifications.length : tabCounts[group.id] ?? 0;
          const isActive = activeTab === group.id;
          return (
            <Link
              key={group.id}
              href={`${baseHref}?tab=${group.id}&page=1`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              {group.id !== "all" && getGroupIcon(group.id)}
              <span>{group.label}</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] ${
                isActive 
                  ? "bg-white/20 text-white" 
                  : "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]"
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Main Notifications Card */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
          {showingPlaceholders ? (
            <span>
              Sample notifications{" "}
              <span className="font-normal text-[var(--foreground-muted)]">(shown until you receive real alerts)</span>
            </span>
          ) : (
            <span>
              {activeTab === "all" ? "Recent" : GROUPS.find(g => g.id === activeTab)?.label} ({filteredRows.length})
            </span>
          )}

          {hasUnread && !showingPlaceholders && (
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
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-10 w-10 text-[var(--foreground-muted)] opacity-40 mb-3" />
              <p className="text-sm font-semibold text-[var(--foreground-primary)]">No notifications found</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                You&apos;re all caught up! No notifications in this category.
              </p>
            </div>
          ) : (
            filteredRows.map((row) => {
              const href = showingPlaceholders ? null : resolveNotificationHref(row, portal);
              const isUnread = row.status === "pending";
              const group = getNotificationGroup(row);
              const { title, message } = getNotificationText(row);

              const content = (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Status Dot */}
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      isUnread ? "bg-[var(--accent-primary)]" : "bg-zinc-200"
                    }`} />
                    
                    {/* Icon wrapper */}
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isUnread ? "bg-white" : "bg-[var(--surface-muted)]"
                    }`}>
                      {getGroupIcon(group)}
                    </div>

                    {/* Text stack */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-[var(--foreground-primary)] leading-normal ${
                        isUnread ? "font-semibold" : "font-medium"
                      }`}>
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

                    {isUnread && !showingPlaceholders && (
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
                    showingPlaceholders 
                      ? "opacity-80" 
                      : isUnread 
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
        {pageCount > 1 && !showingPlaceholders && (
          <div className="border-t border-[var(--border-primary)] bg-[var(--surface-muted)]/20 px-4 py-3">
            <HrPagination
              from={from}
              itemLabel="notifications"
              nextHref={
                page < pageCount ? `${baseHref}?tab=${activeTab}&page=${page + 1}` : undefined
              }
              page={page}
              pageLinks={pages.map((pageNumber) => ({
                page: pageNumber,
                href: `${baseHref}?tab=${activeTab}&page=${pageNumber}`,
              }))}
              prevHref={page > 1 ? `${baseHref}?tab=${activeTab}&page=${page - 1}` : undefined}
              to={to}
              total={total}
            />
          </div>
        )}
      </div>
    </div>
  );
}
