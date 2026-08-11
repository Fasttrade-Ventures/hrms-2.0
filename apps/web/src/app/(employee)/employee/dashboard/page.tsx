import Link from "next/link";

import { StatCard, StatusPill } from "@hrms/ui";

import { AnnouncementDashboardWidget } from "@/components/announcements/announcement-dashboard-widget";
import { formatDateTime } from "@/components/employee/employee-shared";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalIcon } from "@/components/portal/portal-icons";
import {
  getAnnouncementViewer,
  listDashboardAnnouncementItems,
} from "@/lib/announcements/queries";
import { getTodayAttendance } from "@/lib/employee/attendance";
import { getLeaveBalances, listLeaveRequests, requireEmployeeContext } from "@/lib/employee/leave";
import {
  listClaims,
  listOvertimeRequests,
  listLateReports,
  listAttendanceCorrections,
} from "@/lib/employee/requests";
import {
  firstNameFromFullName,
  getCurrentEmployeeDetail,
  greetingForHour,
} from "@/lib/employees/self";

export default async function Page() {
  const hour = new Date().getHours();
  const employee = await getCurrentEmployeeDetail().catch(() => null);
  const firstName = firstNameFromFullName(employee?.fullName, employee?.email);

  const employeeContext = employee ? await requireEmployeeContext().catch(() => null) : null;

  const [
    balances,
    leaveRequests,
    claims,
    otRequests,
    lateReports,
    attendanceRequests,
    todayAttendance,
    announcementFeed
  ] = await Promise.all([
    getLeaveBalances().catch(() => []),
    listLeaveRequests().catch(() => []),
    listClaims().catch(() => []),
    listOvertimeRequests().catch(() => []),
    listLateReports().catch(() => []),
    listAttendanceCorrections().catch(() => []),
    getTodayAttendance().catch(() => null),
    employeeContext
      ? getAnnouncementViewer({
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
      : Promise.resolve({ pinned: [], latest: [] }),
  ]);

  const announcementPinned = announcementFeed.pinned;
  const announcementItems = announcementFeed.latest;
  const annual = balances.find((row) => row.leaveTypeName === "Annual Leave");
  const requests = leaveRequests;

  const pendingRequests =
    leaveRequests.filter((row) => row.status === "pending").length +
    claims.filter((row) => row.status === "pending").length +
    otRequests.filter((row) => row.status === "pending").length +
    lateReports.filter((row) => row.status === "pending").length +
    attendanceRequests.filter((row) => row.status === "pending").length;

  const attendanceLabel = todayAttendance?.clockInAt
    ? todayAttendance.clockOutAt
      ? "Completed"
      : "Clocked in"
    : "Not clocked in";

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description={
          employee
            ? `${employee.employeeNumber}${employee.departmentName ? ` · ${employee.departmentName}` : ""}`
            : "Your leave, attendance, and requests at a glance."
        }
        title={`${greetingForHour(hour)}, ${firstName}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          hint={`${annual?.usedDays ?? 0} used · ${annual?.pendingDays ?? 0} pending`}
          icon={<PortalIcon name="leave" />}
          label="Leave balance"
          value={annual ? `${annual.remainingDays}` : "—"}
        />
        <StatCard
          hint={todayAttendance?.clockInAt ? formatDateTime(todayAttendance.clockInAt) : "Tap attendance to clock in"}
          icon={<PortalIcon name="attendance" />}
          label="Today's attendance"
          value={attendanceLabel}
        />
        <StatCard
          hint="Awaiting manager review"
          icon={<PortalIcon name="approvals" />}
          label="Open requests"
          value={String(pendingRequests)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnnouncementDashboardWidget
          basePath="/employee/announcements"
          items={announcementItems}
          pinnedItems={announcementPinned}
        />

        <PortalSectionCard
          action={
            <StatusPill
              label={pendingRequests > 0 ? `${pendingRequests} pending` : "Up to date"}
              tone={pendingRequests > 0 ? "pending" : "neutral"}
            />
          }
          description={
            requests.length
              ? `You have ${requests.length} leave request(s) on record.`
              : "No leave requests yet."
          }
          title="My requests"
        >
          <Link className="text-sm font-medium text-[var(--accent-primary)]" href="/employee/leave">
            View leave
          </Link>
        </PortalSectionCard>
      </div>

      <PortalSectionCard description="Common tasks from your dashboard." title="Quick actions">
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            href="/employee/attendance"
          >
            Clock in
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/employee/leave"
          >
            Apply leave
          </Link>
        </div>
      </PortalSectionCard>
    </div>
  );
}
