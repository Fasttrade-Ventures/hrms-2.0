import { StatCard } from "@hrms/ui";

import { AnnouncementDashboardWidget } from "@/components/announcements/announcement-dashboard-widget";
import { HrActionQueue } from "@/components/hr/dashboard/hr-action-queue";
import { HrComplianceWatch } from "@/components/hr/dashboard/hr-compliance-watch";
import { HrDashboardHero } from "@/components/hr/dashboard/hr-dashboard-hero";
import { HrWorkforcePulse } from "@/components/hr/dashboard/hr-workforce-pulse";
import { CalendarDaysIcon } from "@/components/portal/portal-icons";
import {
  getAnnouncementViewer,
  listDashboardAnnouncementItems,
} from "@/lib/announcements/queries";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireModule } from "@/lib/entitlements";
import { getHrDashboardData } from "@/lib/hr/dashboard";

export default async function Page() {
  requireModule("announcements");
  const data = await getHrDashboardData();
  const employeeContext = await requireEmployeeContext().catch(() => null);
  const announcementFeed = employeeContext
    ? await getAnnouncementViewer({
        organizationId: employeeContext.organizationId,
        employeeId: employeeContext.employeeId,
        roles: employeeContext.session.membership.roles,
      })
        .then((viewer) =>
          listDashboardAnnouncementItems({
            organizationId: employeeContext.organizationId,
            viewer,
            userId: employeeContext.session.user.id,
          }),
        )
        .catch(() => ({ pinned: [], latest: [] }))
    : { pinned: [], latest: [] };

  return (
    <div className="space-y-3">
      <HrDashboardHero
        description={data.heroDescription}
        firstName={data.firstName}
        greeting={data.greeting}
      />

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-stretch">
        <HrActionQueue rows={data.actionQueue} />
        <div className="flex h-full min-h-0 flex-col gap-3">
          <HrWorkforcePulse
            absentPct={data.workforce.absentPct}
            onLeavePct={data.workforce.onLeavePct}
            presentPct={data.workforce.presentPct}
          />
          <HrComplianceWatch rows={data.compliance} />
          <AnnouncementDashboardWidget
            basePath="/hr/announcements"
            items={announcementFeed.latest}
            pinnedItems={announcementFeed.pinned}
          />
        </div>
      </div>
    </div>
  );
}
