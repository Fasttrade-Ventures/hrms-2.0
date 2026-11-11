import Link from "next/link";

import { LeaveApplyForm } from "@/components/employee/leave-apply-form";
import { RecentLeaveCard } from "@/components/employee/recent-leave-card";
import { PortalIcon } from "@/components/portal/portal-icons";
import {
  getLeaveBalances,
  listLeaveRequests,
  listLeaveTypes,
  requireEmployeeContext,
} from "@/lib/employee/leave";
import { loadLeaveHolidayDates } from "@/lib/leave/holidays";
import { loadLeaveUnits, type LeaveUnits } from "@/lib/leave/units";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; view?: string }>;
}) {
  const query = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const defaultStartDate = query.startDate ?? today;
  const defaultEndDate = query.endDate ?? query.startDate ?? today;

  let holidays: string[] = [];
  let units: LeaveUnits = { country: "MY", standardDayHours: 8 };
  try {
    const { organizationId } = await requireEmployeeContext();
    holidays = await loadLeaveHolidayDates(organizationId);
    units = await loadLeaveUnits(await createClient(), organizationId);
  } catch {
    holidays = [];
  }

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
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground-primary)]">Apply Leave</h2>
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
            existingRequests={requests}
            holidays={holidays}
            units={units}
          />
        </div>

        {/* Side/Right Column (1/3 width) */}
        <div className="space-y-4">
          <RecentLeaveCard
            requests={requests}
            initialViewAll={query.view === "all"}
            standardDayHours={units.country === "AU" ? units.standardDayHours : undefined}
          />
        </div>
      </div>
    </div>
  );
}
