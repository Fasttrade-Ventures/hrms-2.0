"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { formatDate, RequestStatusPill } from "@/components/employee/employee-shared";
import type { LeaveRequestRow } from "@/lib/employee/leave";

export function RecentLeaveCard({
  requests,
  initialViewAll = false,
}: {
  requests: LeaveRequestRow[];
  initialViewAll?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(initialViewAll);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const pageSize = 5;
  const total = requests.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Current page requests for in-card pagination
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, page, pageSize]);

  // Filtered requests for the "View All" modal
  const modalFilteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (filterStatus !== "all" && req.status !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const typeMatch = req.leaveTypeName.toLowerCase().includes(query);
        const reasonMatch = req.reason?.toLowerCase().includes(query);
        const dateMatch = req.startDate.includes(query) || req.endDate.includes(query);
        return typeMatch || Boolean(reasonMatch) || dateMatch;
      }
      return true;
    });
  }, [requests, filterStatus, searchQuery]);

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <>
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] p-[18px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Recent Leave</h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:underline focus:outline-none"
          >
            View all {total > 0 ? `(${total})` : ""}
          </button>
        </div>

        <div className="divide-y divide-[var(--border-primary)]">
          {paginatedRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <Link
                  className="text-xs font-semibold text-[var(--foreground-primary)] hover:text-[var(--accent-primary)] truncate"
                  href={`/employee/leave/${req.id}`}
                >
                  {req.leaveTypeName}
                </Link>
                <span className="text-[10px] text-[var(--foreground-muted)] font-medium">
                  {formatDate(req.startDate)}
                  {req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ""}
                  {` · ${req.days} Day${req.days > 1 ? "s" : ""}`}
                </span>
              </div>
              <RequestStatusPill status={req.status} />
            </div>
          ))}

          {!requests.length && (
            <p className="text-xs text-[var(--foreground-muted)] py-4 text-center">No recent leave.</p>
          )}
        </div>

        {total > pageSize && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)] text-[13px] text-[var(--foreground-muted)]">
            <span>
              Showing {startItem}–{endItem} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-[var(--foreground-secondary)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] p-5">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground-primary)]">
                  All Leave Requests
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  {requests.length} total request{requests.length === 1 ? "" : "s"} submitted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground-primary)] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 border-b border-[var(--border-primary)] space-y-3 bg-[var(--surface-muted)]/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
                <input
                  type="text"
                  placeholder="Search by leave type or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] text-[var(--foreground-primary)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {["all", "pending", "approved", "cancelled", "revoked", "rejected"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-full font-medium transition-colors capitalize ${
                      filterStatus === status
                        ? "bg-[var(--accent-primary)] text-white"
                        : "bg-[var(--surface-card)] border border-[var(--border-primary)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body / Scrollable List */}
            <div className="overflow-y-auto p-5 divide-y divide-[var(--border-primary)] flex-1 min-h-[220px]">
              {modalFilteredRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <Link
                      href={`/employee/leave/${req.id}`}
                      className="text-sm font-semibold text-[var(--foreground-primary)] hover:text-[var(--accent-primary)] truncate"
                      onClick={() => setIsModalOpen(false)}
                    >
                      {req.leaveTypeName}
                    </Link>
                    <span className="text-xs text-[var(--foreground-muted)] font-medium">
                      {formatDate(req.startDate)}
                      {req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ""}
                      {` · ${req.days} Day${req.days > 1 ? "s" : ""}`}
                      {req.halfDay ? " (Half Day)" : ""}
                    </span>
                    {req.reason && (
                      <p className="text-xs text-[var(--foreground-secondary)] italic truncate max-w-md">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RequestStatusPill status={req.status} />
                    <Link
                      href={`/employee/leave/${req.id}`}
                      onClick={() => setIsModalOpen(false)}
                      className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      View &rarr;
                    </Link>
                  </div>
                </div>
              ))}

              {!modalFilteredRequests.length && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">No leave requests found</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    Try adjusting your status filter or search query.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[var(--border-primary)] p-4 bg-[var(--surface-muted)]/20">
              <span className="text-xs text-[var(--foreground-muted)]">
                Showing {modalFilteredRequests.length} of {requests.length} requests
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
