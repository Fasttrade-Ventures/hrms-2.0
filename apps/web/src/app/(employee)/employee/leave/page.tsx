import Link from "next/link";

import { LeaveApplyForm } from "@/components/employee/leave-apply-form";
import { formatDate, RequestStatusPill } from "@/components/employee/employee-shared";

import { PortalIcon } from "@/components/portal/portal-icons";
import {
  getLeaveBalances,
  listLeaveRequests,
  listLeaveTypes,
} from "@/lib/employee/leave";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const query = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const defaultStartDate = query.startDate ?? today;
  const defaultEndDate = query.endDate ?? query.startDate ?? today;
  const [leaveTypes, requests, balances] = await Promise.all([
    listLeaveTypes(),
    listLeaveRequests(),
    getLeaveBalances(),
  ]);

  return (
    <div className="space-y-6">

      {/* Head section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground-primary)]">Apply Leave</h1>
          <p className="text-sm text-[var(--foreground-muted)] font-medium">
            Working Days Exclude Weekends & Observed Holidays
          </p>
        </div>
        <div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)] transition shadow-sm gap-2 text-[var(--foreground-primary)]"
            href="/employee/calendar"
          >
            <PortalIcon name="calendar" className="h-4 w-4 text-[var(--accent-primary)]" />
            Calendar
          </Link>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main/Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <LeaveApplyForm
            balances={balances}
            defaultEndDate={defaultEndDate}
            defaultStartDate={defaultStartDate}
            leaveTypes={leaveTypes}
          />
        </div>

        {/* Side/Right Column (1/3 width) */}
        <div className="space-y-4">
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] p-[18px] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Recent Leave</h3>
              <Link href="/employee/leave" className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">
                View All
              </Link>
            </div>
            
            <div className="divide-y divide-[var(--border-primary)]">
              {requests.slice(0, 5).map((req) => (
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
                <p className="text-xs text-[var(--foreground-muted)] py-4 text-center">No Recent Leave.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
