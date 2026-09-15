"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, StatusPill } from "@hrms/ui";

import { PortalIcon } from "@/components/portal/portal-icons";
import type { ApprovalInboxRow } from "@/lib/approvals/types";

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

  // Calculate counts for each tab
  const counts = useMemo(() => {
    return {
      all: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      expired: rows.filter((r) => r.status === "expired").length,
    };
  }, [rows]);

  // Filter rows based on active tab and search query
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Tab filter
      if (activeTab === "pending" && row.status !== "pending") return false;
      if (activeTab === "approved" && row.status !== "approved") return false;
      if (activeTab === "rejected" && row.status !== "rejected") return false;
      if (activeTab === "expired" && row.status !== "expired") return false;

      // 2. Search filter
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

  // Pagination calculations
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
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "expired":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "expired") return "Expired";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-4">
      {/* Notice Banners */}
      {approvedNotice && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-[var(--success)]">
          <span>✓</span>
          <span>Request approved successfully.</span>
        </div>
      )}
      {rejectedNotice && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-[var(--danger)]">
          <span>✕</span>
          <span>Request rejected.</span>
        </div>
      )}

      {/* Main Card Container */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-sm">
        {/* Header with Tabs and Search */}
        <div className="border-b border-[var(--border-primary)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Tabs */}
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
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? "bg-[var(--surface-card)] text-[var(--foreground-primary)] shadow-sm"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? tab.key === "pending"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : tab.key === "expired"
                              ? "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400"
                              : "bg-[var(--surface-muted)] text-[var(--foreground-primary)]"
                          : "bg-black/5 text-[var(--foreground-muted)] dark:bg-white/5"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search requests or employees…"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] py-1.5 pl-8 pr-3 text-xs text-[var(--foreground-primary)] placeholder-[var(--foreground-muted)] outline-none transition-colors focus:border-[var(--border-focus)] focus:bg-[var(--surface-card)]"
              />
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Table / List */}
        {paginatedRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                searchQuery
                  ? "No matching requests"
                  : activeTab === "pending"
                    ? "Inbox zero — all caught up!"
                    : activeTab === "expired"
                      ? "No expired requests"
                      : `No ${activeTab} requests`
              }
              description={
                searchQuery
                  ? "Try adjusting your search terms or clearing filters."
                  : activeTab === "pending"
                    ? "New requests awaiting your decision will appear here."
                    : `Requests with ${activeTab} status will be listed here.`
              }
              icon={<PortalIcon name="approvals" className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Summary</th>
                  <th className="px-5 py-3 w-32">Status</th>
                  <th className="px-5 py-3 w-32 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {paginatedRows.map((row) => {
                  const isPending = row.status === "pending";

                  return (
                    <tr
                      key={row.stepId}
                      className="group transition-colors hover:bg-[var(--surface-muted)]/50"
                    >
                      {/* Request Info */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/manager/approvals/${row.stepId}`}
                          className="font-medium text-[var(--foreground-primary)] group-hover:text-[var(--accent-primary)] transition-colors"
                        >
                          <span className="font-semibold">{row.requestTypeLabel}</span>
                          <span className="text-[var(--foreground-muted)]"> · </span>
                          <span>{row.requesterName}</span>
                        </Link>
                        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                          ID: {row.requesterEmployeeNumber}
                        </p>
                      </td>

                      {/* Summary */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-[var(--foreground-primary)] truncate max-w-md">
                          {row.summary}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                          Submitted: {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusPill
                          label={getStatusLabel(row.status)}
                          tone={getStatusTone(row.status)}
                        />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/manager/approvals/${row.stepId}`}
                          className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                            isPending
                              ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] shadow-xs"
                              : "border border-[var(--border-primary)] bg-[var(--surface-card)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground-primary)]"
                          }`}
                        >
                          <span>{isPending ? "Review" : "View"}</span>
                          <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with Pagination matching Pencil c2DqY1 */}
        {filteredRows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-primary)] bg-[var(--surface-muted)]/30 px-5 py-3.5 text-xs text-[var(--foreground-muted)]">
            <div>
              Showing <span className="font-semibold text-[var(--foreground-primary)]">{startIndex + 1}</span>–
              <span className="font-semibold text-[var(--foreground-primary)]">{endIndex}</span> of{" "}
              <span className="font-semibold text-[var(--foreground-primary)]">{filteredRows.length}</span> requests
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={effectivePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] text-xs font-semibold text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span className="px-2 text-xs font-medium text-[var(--foreground-primary)]">
                  Page {effectivePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] text-xs font-semibold text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
