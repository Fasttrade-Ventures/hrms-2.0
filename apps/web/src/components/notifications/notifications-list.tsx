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

import { EmptyState } from "@hrms/ui";
import { formatDateTime } from "@/components/employee/employee-shared";
import { resolveNotificationHref } from "@/lib/notifications/links";
import type { NotificationPortal } from "@/lib/notifications/placeholders";
import { notificationTypeDescriptions } from "@/lib/notifications/placeholders";
import type { NotificationRow } from "@/lib/notifications/types";
import { formatNotificationMessage } from "@/lib/notifications/types";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notifications/actions";

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
  placeholderNotifications = [],
  portal,
}: {
  notifications: NotificationRow[];
  placeholderNotifications?: NotificationRow[];
  portal: NotificationPortal;
}) {
  const [showingPlaceholders, setShowingPlaceholders] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [activeTab, setActiveTab] = useState<typeof GROUPS[number]["id"] | "all">("all");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (notifications.length === 0) {
      setRows(placeholderNotifications);
      setShowingPlaceholders(true);
    } else {
      setRows(notifications);
      setShowingPlaceholders(false);
    }
  }, [notifications, placeholderNotifications]);

  const filteredRows = rows.filter((row) => {
    if (activeTab === "all") return true;
    return getNotificationGroup(row) === activeTab;
  });

  const hasUnread = rows.some((row) => row.status === "pending");

  const handleMarkRead = async (id: string) => {
    if (showingPlaceholders || isPending) return;
    setIsPending(true);
    try {
      await markNotificationReadAction(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "sent" as const } : r)));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setIsPending(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (showingPlaceholders || isPending) return;
    setIsPending(true);
    try {
      await markAllNotificationsReadAction();
      setRows((prev) => prev.map((r) => ({ ...r, status: "sent" as const })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setIsPending(false);
    }
  };

  const handleItemClick = async (e: React.MouseEvent, row: NotificationRow) => {
    if (showingPlaceholders) return;
    if (row.status === "pending") {
      await handleMarkRead(row.id);
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
          const count = rows.filter(
            (row) => group.id === "all" || getNotificationGroup(row) === group.id,
          ).length;
          const isActive = activeTab === group.id;
          return (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
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
            </button>
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
            <EmptyState
              description="You're all caught up! No notifications in this category."
              icon={<Bell className="h-6 w-6" />}
              title="No notifications found"
              variant="flat"
            />
          ) : (
            filteredRows.map((row) => {
              const href = showingPlaceholders ? null : resolveNotificationHref(row, portal);
              const isUnread = row.status === "pending";
              const group = getNotificationGroup(row);

              const content = (
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                      isUnread ? "bg-[var(--surface-accent-soft)]" : "bg-[var(--surface-muted)]"
                    }`}>
                      {getGroupIcon(group)}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className={`text-sm text-[var(--foreground-primary)] leading-normal break-words ${
                        isUnread ? "font-semibold" : "font-normal"
                      }`}>
                        {formatNotificationMessage(row)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--foreground-muted)]">
                        <span>{formatDateTime(row.createdAt)}</span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                            New
                          </span>
                        )}
                        {href ? (
                          <span className="font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-0.5">
                            View details
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {isUnread && !showingPlaceholders && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMarkRead(row.id);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors px-2.5 py-1.5 rounded bg-[var(--surface-accent-soft)]/50 hover:bg-[var(--surface-accent-soft)] cursor-pointer whitespace-nowrap"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>
              );

              if (href) {
                return (
                  <Link
                    className={`block px-5 py-4 transition-colors ${
                      isUnread 
                        ? "bg-[var(--surface-accent-soft)]/10 hover:bg-[var(--surface-accent-soft)]/20" 
                        : "hover:bg-[var(--surface-muted)]"
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
                  className={`px-5 py-4 transition-colors ${
                    showingPlaceholders 
                      ? "opacity-80" 
                      : isUnread 
                        ? "cursor-pointer bg-[var(--surface-accent-soft)]/10 hover:bg-[var(--surface-accent-soft)]/20" 
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
      </div>
    </div>
  );
}
