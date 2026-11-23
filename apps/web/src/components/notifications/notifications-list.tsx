"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Bell,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  Info,
  Megaphone,
} from "@/components/portal/product-icons";

import { EmptyState } from "@hrms/ui";

import { HrPagination } from "@/components/hr/hr-ui.client";
import { PortalCard } from "@/components/portal/portal-card";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { Button } from "@/components/ui/button";
import { REQUEST_TYPE_LABELS } from "@/lib/approvals/types";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/notifications/actions";
import { resolveNotificationHref } from "@/lib/notifications/links";
import {
  type NotificationPortal,
  notificationTypeDescriptions,
} from "@/lib/notifications/placeholders";
import type { NotificationRow } from "@/lib/notifications/types";
import { formatNotificationMessage } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

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
    const requesterName = row.payload.requesterName ? String(row.payload.requesterName) : null;
    const summary = row.payload.requestSummary ? String(row.payload.requestSummary) : null;
    return {
      title: requesterName ? `${requesterName} · ${label} pending` : `${label} pending approval`,
      message: summary
        ? `${summary} is awaiting your approval.`
        : `${label} request is awaiting your approval.`,
    };
  }
  if (row.template === "approval.approve") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    const summary = row.payload.requestSummary ? String(row.payload.requestSummary) : null;
    return {
      title: `${label} approved`,
      message: summary
        ? `Your ${label.toLowerCase()} request (${summary}) was approved.`
        : `Your ${label.toLowerCase()} request was approved.`,
    };
  }
  if (row.template === "approval.reject") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    const summary = row.payload.requestSummary ? String(row.payload.requestSummary) : null;
    return {
      title: `${label} rejected`,
      message: summary
        ? `Your ${label.toLowerCase()} request (${summary}) was rejected.`
        : `Your ${label.toLowerCase()} request was rejected.`,
    };
  }
  if (row.template === "approval.cancel") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    const actorName = row.payload.actorName ? String(row.payload.actorName) : null;
    return {
      title: `${label} request cancelled`,
      message: actorName
        ? `${actorName} cancelled their ${label.toLowerCase()} request.`
        : `Your ${label.toLowerCase()} request was cancelled.`,
    };
  }
  if (row.template === "approval.revoke") {
    const requestType = String(row.payload.requestType ?? "");
    const label = REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    const actorName = row.payload.actorName ? String(row.payload.actorName) : null;
    return {
      title: `${label} revoked by employee`,
      message: actorName
        ? `${actorName} revoked their approved ${label.toLowerCase()} request.`
        : `Your ${label.toLowerCase()} request was revoked.`,
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
  if (row.template === "employee.probation_ending") {
    return {
      title: String(row.payload.title ?? "Probation ending"),
      message: String(row.payload.message ?? "An employee's probation is ending."),
    };
  }
  if (row.template === "leave.balance_reminder") {
    return {
      title: String(row.payload.title ?? "Leave balance reminder"),
      message: String(row.payload.message ?? "Your leave balance needs attention."),
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
      <PortalPageHeader
        description="Approvals, reminders, and updates for your role."
        title="Notifications"
      />

      <PortalSectionCard description="Categories that land in this inbox for your role." title="What appears here">
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--foreground-muted)]">
          {descriptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PortalSectionCard>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        {GROUPS.map((group) => {
          const count = localTabCounts[group.id] ?? 0;
          const isActive = activeTab === group.id;
          return (
            <Link
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                isActive
                  ? "border-transparent bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
                  : "border-[var(--border-primary)] bg-[var(--surface-card)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]",
              )}
              href={`${baseHref}?tab=${group.id}&page=1${filterQuery}`}
              key={group.id}
            >
              {group.id !== "all" ? getGroupIcon(group.id, false) : null}
              <span>{group.label}</span>
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] dark:bg-white/5">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <PortalCard className="overflow-hidden" padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {activeTab === "all" ? "Recent" : GROUPS.find((g) => g.id === activeTab)?.label} (
              {isUnreadOnly ? (localTabCounts[activeTab] ?? filteredRows.length) : total})
            </span>

            <div className="inline-flex rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-0.5 text-xs font-medium">
              <Link
                className={cn(
                  "rounded-md px-2.5 py-1 transition-all",
                  !isUnreadOnly
                    ? "bg-[var(--surface-accent-soft)] font-semibold text-[var(--accent-primary)]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]",
                )}
                href={`${baseHref}?tab=${activeTab}&page=1&filter=all`}
              >
                All
              </Link>
              <Link
                className={cn(
                  "rounded-md px-2.5 py-1 transition-all",
                  isUnreadOnly
                    ? "bg-[var(--surface-accent-soft)] font-semibold text-[var(--accent-primary)]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]",
                )}
                href={`${baseHref}?tab=${activeTab}&page=1&filter=unread`}
              >
                Unread only
              </Link>
            </div>
          </div>

          {hasUnread ? (
            <Button
              className="h-8 gap-1 text-xs"
              disabled={isPending}
              onClick={handleMarkAllAsRead}
              size="sm"
              type="button"
              variant="ghost"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Mark all as read
            </Button>
          ) : null}
        </div>

        <div className="divide-y divide-[var(--border-primary)]">
          {filteredRows.length === 0 ? (
            <EmptyState
              description="Nothing in this category right now. New approvals and reminders will show up here."
              icon={<Bell />}
              title="You're all caught up"
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
                    <span
                      suppressHydrationWarning
                      className="text-xs text-[var(--foreground-muted)] whitespace-nowrap"
                    >
                      {formatRelativeTime(row.createdAt)}
                    </span>

                    {isUnread ? (
                      <Button
                        className="h-7 gap-1 px-2.5 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkAsRead(row.id);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark read
                      </Button>
                    ) : null}
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
        {pageCount > 1 ? (
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
        ) : null}
      </PortalCard>
    </div>
  );
}
