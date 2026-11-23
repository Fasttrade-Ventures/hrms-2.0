"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, StatusPill } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { PortalCard } from "@/components/portal/portal-card";
import { PortalIcon } from "@/components/portal/portal-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApprovalInboxRow } from "@/lib/approvals/types";
import { cn } from "@/lib/utils";

type TabKey = "all" | "pending" | "approved" | "rejected" | "expired";

const PAGE_SIZE = 10;

export function ManagerApprovalsView({
  rows,
  approvedNotice,
  rejectedNotice,
}: {
  rows: ApprovalInboxRow[];
  approvedNotice?: boolean;
  rejectedNotice?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      expired: rows.filter((r) => r.status === "expired").length,
    }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeTab === "pending" && row.status !== "pending") return false;
      if (activeTab === "approved" && row.status !== "approved") return false;
      if (activeTab === "rejected" && row.status !== "rejected") return false;
      if (activeTab === "expired" && row.status !== "expired") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = row.requesterName.toLowerCase().includes(query);
        const matchNumber = row.requesterEmployeeNumber.toLowerCase().includes(query);
        const matchType = row.requestTypeLabel.toLowerCase().includes(query);
        const matchSummary = row.summary.toLowerCase().includes(query);
        if (!matchName && !matchNumber && !matchType && !matchSummary) {
          return false;
        }
      }

      return true;
    });
  }, [rows, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredRows.length);
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "pending":
        return "warning" as const;
      case "approved":
        return "success" as const;
      case "rejected":
      case "revoked":
        return "danger" as const;
      default:
        return "neutral" as const;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "expired") return "Expired";
    if (status === "cancelled") return "Cancelled by Employee";
    if (status === "revoked") return "Revoked by Employee";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-4">
      {approvedNotice ? (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-[var(--success)]">
          Request approved successfully.
        </div>
      ) : null}
      {rejectedNotice ? (
        <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-[var(--danger)]">
          Request rejected.
        </div>
      ) : null}

      <PortalCard className="overflow-hidden" padding="none">
        <div className="border-b border-[var(--border-primary)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-1">
              {(
                [
                  { key: "pending", label: "Pending", count: counts.pending },
                  { key: "approved", label: "Approved", count: counts.approved },
                  { key: "rejected", label: "Rejected", count: counts.rejected },
                  { key: "expired", label: "Expired", count: counts.expired },
                  { key: "all", label: "All", count: counts.all },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Button
                    key={tab.key}
                    className={cn(
                      "h-8 gap-2 px-3 text-xs",
                      isActive
                        ? "bg-[var(--surface-card)] text-[var(--foreground-primary)] shadow-sm"
                        : "text-[var(--foreground-muted)]",
                    )}
                    onClick={() => handleTabChange(tab.key)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold",
                        isActive
                          ? "bg-[var(--surface-muted)] text-[var(--foreground-primary)]"
                          : "bg-black/5 text-[var(--foreground-muted)] dark:bg-white/5",
                      )}
                    >
                      {tab.count}
                    </span>
                  </Button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Input
                className="h-9 pr-8"
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search requests or employees…"
                type="search"
                value={searchQuery}
              />
              {searchQuery ? (
                <Button
                  className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2 text-xs"
                  onClick={() => handleSearchChange("")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {paginatedRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              description={
                searchQuery
                  ? "Try adjusting your search terms or clearing filters."
                  : activeTab === "pending"
                    ? "New requests awaiting your decision will appear here."
                    : `Requests with ${activeTab} status will be listed here.`
              }
              icon={<PortalIcon name="approvals" className="h-6 w-6" />}
              title={
                searchQuery
                  ? "No matching requests"
                  : activeTab === "pending"
                    ? "Inbox zero — all caught up!"
                    : activeTab === "expired"
                      ? "No expired requests"
                      : `No ${activeTab} requests`
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Summary</th>
                  <th className="w-32 px-5 py-3">Status</th>
                  <th className="w-32 whitespace-nowrap px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {paginatedRows.map((row) => {
                  const isPending = row.status === "pending";
                  return (
                    <tr
                      className="group transition-colors hover:bg-[var(--surface-muted)]/50"
                      key={row.stepId}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          className="font-medium text-[var(--foreground-primary)] transition-colors group-hover:text-[var(--accent-primary)]"
                          href={`/manager/approvals/${row.stepId}`}
                        >
                          <span className="font-semibold">{row.requestTypeLabel}</span>
                          <span className="text-[var(--foreground-muted)]"> · </span>
                          <span>{row.requesterName}</span>
                        </Link>
                        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                          ID: {row.requesterEmployeeNumber}
                          {row.stepLabel ? ` · ${row.stepLabel}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="max-w-md truncate text-sm font-medium text-[var(--foreground-primary)]">
                          {row.summary}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                          Submitted: {formatDate(row.submittedAt)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {row.isEscalated ? (
                            <StatusPill label="Escalated" tone="warning" />
                          ) : null}
                          <StatusPill
                            label={getStatusLabel(row.status)}
                            tone={getStatusTone(row.status)}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <Button
                          render={<Link href={`/manager/approvals/${row.stepId}`} />}
                          size="sm"
                          variant={isPending ? "default" : "outline"}
                        >
                          {isPending ? "Review" : "View"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredRows.length > 0 ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border-primary)] bg-[var(--surface-muted)]/30 px-5 py-3.5 text-xs text-[var(--foreground-muted)] sm:flex-row">
            <div>
              Showing{" "}
              <span className="font-semibold text-[var(--foreground-primary)]">{startIndex + 1}</span>–
              <span className="font-semibold text-[var(--foreground-primary)]">{endIndex}</span> of{" "}
              <span className="font-semibold text-[var(--foreground-primary)]">
                {filteredRows.length}
              </span>{" "}
              requests
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Previous page"
                  disabled={effectivePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  ‹
                </Button>
                <span className="px-2 text-xs font-medium text-[var(--foreground-primary)]">
                  Page {effectivePage} of {totalPages}
                </span>
                <Button
                  aria-label="Next page"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  ›
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </PortalCard>
    </div>
  );
}
