import { StatCard } from "@hrms/ui";

import { HrActionQueue } from "@/components/hr/dashboard/hr-action-queue";
import { HrComplianceWatch } from "@/components/hr/dashboard/hr-compliance-watch";
import { HrDashboardHero } from "@/components/hr/dashboard/hr-dashboard-hero";
import { HrWorkforcePulse } from "@/components/hr/dashboard/hr-workforce-pulse";
import { CalendarDaysIcon } from "@/components/portal/portal-icons";
import { getHrDashboardData } from "@/lib/hr/dashboard";

export default async function Page() {
  const data = await getHrDashboardData();

  return (
    <div className="space-y-4">
      <HrDashboardHero
        description={data.heroDescription}
        firstName={data.firstName}
        greeting={data.greeting}
      />

      {/* Pencil Card/Stat uses calendar-days chip on every metric card */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint="all branches"
          icon={<CalendarDaysIcon />}
          label="Active employees"
          value={String(data.activeEmployees)}
        />
        <StatCard
          hint="org-wide queue"
          icon={<CalendarDaysIcon />}
          label="Pending requests"
          value={String(data.pendingRequests)}
        />
        <StatCard
          hint="next 30 days"
          icon={<CalendarDaysIcon />}
          label="Docs expiring"
          value={String(data.docsExpiring)}
        />
        <StatCard
          hint="this pay cycle"
          icon={<CalendarDaysIcon />}
          label="Est. monthly payout"
          value={data.estimatedPayout}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <HrActionQueue rows={data.actionQueue} />
        <div className="flex flex-col gap-4">
          <HrWorkforcePulse
            absentPct={data.workforce.absentPct}
            onLeavePct={data.workforce.onLeavePct}
            presentPct={data.workforce.presentPct}
          />
          <HrComplianceWatch rows={data.compliance} />
        </div>
      </div>
    </div>
  );
}
