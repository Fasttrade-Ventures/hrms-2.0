import Link from "next/link";

import { StatCard, StatusPill } from "@hrms/ui";

import { PortalIcon } from "@/components/portal/portal-icons";
import { formatDate } from "@/components/employee/employee-shared";
import { DashboardClockPanel } from "@/components/employee/dashboard-clock-panel";
import { getEmployeeAttendanceContext } from "@/lib/employee/attendance-context";
import {
  getAnnouncementViewer,
  listDashboardAnnouncementItems,
} from "@/lib/announcements/queries";
import { getTodayAttendance } from "@/lib/employee/attendance";
import { getLeaveBalances, listLeaveRequests, requireEmployeeContext, type LeaveBalanceRow } from "@/lib/employee/leave";
import { getMyDocumentComplianceSummary } from "@/lib/employee/documents";
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

type ActivityItem = {
  id: string;
  type: "leave" | "claim" | "overtime" | "late" | "attendance";
  title: string;
  meta: string;
  status: string;
  createdAt: string;
  link: string;
};

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
    announcementFeed,
    complianceSummary,
    attendanceContext
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
    getMyDocumentComplianceSummary().catch(() => ({ missing: 0, expiring: 0, uploadableTypes: [] })),
    getEmployeeAttendanceContext().catch(() => ({ geofence: null, locationModuleEnabled: false })),
  ]);

  const announcementPinned = announcementFeed.pinned;
  const announcementItems = announcementFeed.latest;
  const allAnnouncements = [...announcementPinned, ...announcementItems];

  const annualBal = balances.find((b) => b.leaveTypeName.toLowerCase().includes("annual"));
  const medicalBal = balances.find((b) => b.leaveTypeName.toLowerCase().includes("medical"));
  const emergencyBal = balances.find((b) => b.leaveTypeName.toLowerCase().includes("emergency"));
  const replacementBal = balances.find((b) => b.leaveTypeName.toLowerCase().includes("replacement"));

  // 1. Today
  const attendanceHint = employee?.shiftName ? `Shift ${employee.shiftName}` : "No Scheduled Shift";
  const attendanceLabel = todayAttendance?.clockInAt
    ? todayAttendance.clockOutAt
      ? "Completed"
      : "Clocked In"
    : "Not Clocked";

  // 2. Pending
  const pendingLeaves = leaveRequests.filter((row) => row.status === "pending").length;
  const pendingClaims = claims.filter((row) => row.status === "pending").length;
  const pendingOt = otRequests.filter((row) => row.status === "pending").length;
  const pendingLate = lateReports.filter((row) => row.status === "pending").length;
  const pendingAttendance = attendanceRequests.filter((row) => row.status === "pending").length;

  const totalPending = pendingLeaves + pendingClaims + pendingOt + pendingLate + pendingAttendance;

  const pendingParts = [];
  if (pendingLeaves > 0) pendingParts.push(`${pendingLeaves} Leave`);
  if (pendingClaims > 0) pendingParts.push(`${pendingClaims} Claim`);
  if (pendingOt > 0) pendingParts.push(`${pendingOt} OT`);
  if (pendingLate > 0) pendingParts.push(`${pendingLate} Late`);
  if (pendingAttendance > 0) pendingParts.push(`${pendingAttendance} Correction`);

  const pendingHint = pendingParts.join(" · ") || "All Caught Up";

  // 3. OT this month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const otThisMonth = otRequests.filter((req) => {
    if (!req.workDate) return false;
    const [year, month] = req.workDate.split("-");
    return Number(year) === currentYear && (Number(month) - 1) === currentMonth;
  });
  const totalOtHours = otThisMonth
    .filter((req) => req.status === "approved")
    .reduce((sum, req) => sum + req.hours, 0);
  const approvedOtCount = otThisMonth.filter((req) => req.status === "approved").length;

  // 4. Docs due
  const missingDocs = complianceSummary.missing;
  const docsHint = missingDocs > 0
    ? complianceSummary.uploadableTypes[0]?.name
    : "All Documents Uploaded";

  // Compile and sort recent activity (latest 5 across all modules)
  const activities: ActivityItem[] = [
    ...leaveRequests.map((r) => ({
      id: r.id,
      type: "leave" as const,
      title: r.leaveTypeName,
      meta: `${formatDate(r.startDate)}${r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ""} · ${r.days} Day${r.days > 1 ? "s" : ""}`,
      status: r.status,
      createdAt: r.createdAt,
      link: `/employee/leave/${r.id}`,
    })),
    ...claims.map((c) => ({
      id: c.id,
      type: "claim" as const,
      title: `${c.claimTypeName} · RM ${Number(c.amount).toFixed(2)}`,
      meta: `${formatDate(c.createdAt)} · Receipt Attached`,
      status: c.status,
      createdAt: c.createdAt,
      link: `/employee/claims/${c.id}`,
    })),
    ...otRequests.map((o) => ({
      id: o.id,
      type: "overtime" as const,
      title: `Overtime ${o.hours}h`,
      meta: `${formatDate(o.workDate)}`,
      status: o.status,
      createdAt: o.createdAt,
      link: `/employee/overtime/${o.id}`,
    })),
    ...lateReports.map((l) => ({
      id: l.id,
      type: "late" as const,
      title: "Late Report",
      meta: `${formatDate(l.requestDate)} · Arrived ${l.actualArrivalTime || ""}`,
      status: l.status,
      createdAt: l.createdAt,
      link: `/employee/report-late/${l.id}`,
    })),
    ...attendanceRequests.map((a) => ({
      id: a.id,
      type: "attendance" as const,
      title: "Attendance Correction",
      meta: `${formatDate(a.requestDate)}`,
      status: a.status,
      createdAt: a.createdAt,
      link: `/employee/attendance`,
    })),
  ];

  const latestActivities = activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const BalanceBox = ({ label, balance }: { label: string; balance?: LeaveBalanceRow }) => (
    <div className="flex flex-col justify-between rounded-lg bg-[var(--surface-muted)] p-[10px] px-[12px] gap-1">
      <span className="text-[11px] font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-xl font-bold text-[var(--foreground-primary)]">
          {balance ? balance.remainingDays : "0"}
        </span>
        <span className="text-[11px] text-[var(--foreground-muted)]">days</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Head */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground-primary)]">
            {greetingForHour(hour)}, {firstName}
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            {employee?.departmentName ? ` · ${employee.departmentName}` : ""}
            {employee?.shiftName ? ` · Shift ${employee.shiftName}` : ""}
          </p>
        </div>
        <div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition shadow-sm"
            href="/employee/leave"
          >
            Apply Leave
          </Link>
        </div>
      </div>

      {/* Top Band */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex min-h-[168px]">
          <DashboardClockPanel
            geofence={attendanceContext.geofence}
            locationModuleEnabled={attendanceContext.locationModuleEnabled}
            today={todayAttendance}
          />
        </div>
        
        <div className="w-full lg:w-[320px] shrink-0 rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] p-4 flex flex-col gap-3">
          <h4 className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Leave Balances</h4>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <BalanceBox label="Annual" balance={annualBal} />
            <BalanceBox label="Medical" balance={medicalBal} />
            <BalanceBox label="Emergency" balance={emergencyBal} />
            <BalanceBox label="Replacement" balance={replacementBal} />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint={attendanceHint}
          icon={<PortalIcon name="attendance" />}
          label="Today"
          value={attendanceLabel}
        />
        <StatCard
          hint={pendingHint}
          icon={<PortalIcon name="approvals" />}
          label="Pending"
          value={totalPending > 0 ? `${totalPending} Request${totalPending > 1 ? "s" : ""}` : "0 Requests"}
        />
        <StatCard
          hint={`${approvedOtCount} Approved`}
          icon={<PortalIcon name="overtime" />}
          label="OT This Month"
          value={`${totalOtHours} Hrs`}
        />
        <StatCard
          hint={docsHint}
          icon={<PortalIcon name="documents" />}
          label="Docs Due"
          value={missingDocs > 0 ? `${missingDocs} Missing` : "Compliant"}
        />
      </div>

      {/* Body Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Card (left/main col) */}
        <div className="lg:col-span-2 rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--foreground-primary)]">Recent Activity</h3>
            <Link href="/employee/leave" className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">
              View All
            </Link>
          </div>
          
          <div className="divide-y divide-[var(--border-primary)] flex-1">
            {latestActivities.map((act) => (
              <div key={act.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--foreground-secondary)]">
                  <PortalIcon name={act.type === "leave" ? "leave" : act.type === "claim" ? "claims" : act.type === "overtime" ? "overtime" : "attendance"} />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={act.link} className="block text-sm font-semibold text-[var(--foreground-primary)] hover:text-[var(--accent-primary)] truncate">
                    {act.title}
                  </Link>
                  <p className="text-xs text-[var(--foreground-muted)]">{act.meta}</p>
                </div>
                <StatusPill label={act.status} tone={act.status === "approved" ? "success" : act.status === "rejected" ? "danger" : "pending"} />
              </div>
            ))}
            {!latestActivities.length && (
              <p className="text-xs text-[var(--foreground-muted)] py-6 text-center">No Recent Activity.</p>
            )}
          </div>
          
          <p className="text-[10px] text-[var(--foreground-muted)] mt-auto pt-2 border-t border-[var(--border-primary)]">
            Latest 5 Across Leave, Claims, OT & Attendance
          </p>
        </div>

        {/* Side Col (right col) */}
        <div className="space-y-4">
          {/* Missing Documents Card */}
          {complianceSummary.missing > 0 && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--danger)]/20 bg-[var(--danger-soft)]/50 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[var(--danger)]">
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="text-sm font-semibold text-[var(--danger)]">Missing Documents</h4>
              </div>
              <ul className="text-xs space-y-1.5 text-[var(--foreground-primary)] list-disc list-inside pl-1 font-semibold">
                {complianceSummary.uploadableTypes.map((type) => (
                  <li key={type.id}>
                    <Link
                      href={`/employee/documents?type=${encodeURIComponent(type.name)}`}
                      className="hover:underline hover:text-[var(--accent-hover)] transition"
                    >
                      {type.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/employee/documents"
                className="mt-1 w-full text-center inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] text-xs font-semibold text-white hover:opacity-90 shadow-sm transition"
              >
                Upload Now
              </Link>
            </div>
          )}

          {/* Announcements Card */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--foreground-primary)]">Announcements</h4>
              <Link href="/employee/announcements" className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">
                All
              </Link>
            </div>
            <div className="divide-y divide-[var(--border-primary)]">
              {allAnnouncements.slice(0, 3).map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                  <Link href={`/employee/announcements/${item.id}`} className="text-xs font-semibold text-[var(--foreground-primary)] hover:text-[var(--accent-primary)] hover:underline">
                    {item.title}
                  </Link>
                  <span className="text-[10px] text-[var(--foreground-muted)]">
                    {formatDate(item.postedAt ?? item.displayFrom ?? "")}
                  </span>
                </div>
              ))}
              {!allAnnouncements.length && (
                <p className="text-xs text-[var(--foreground-muted)] py-2">No Announcements.</p>
              )}
            </div>
          </div>

          {/* Birthdays Banner */}
          <div className="rounded-[var(--radius-xl)] bg-[var(--surface-accent-soft)] p-3.5 flex items-center gap-3">
            <div className="text-[var(--accent-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[var(--foreground-primary)]">Birthdays This Week</span>
              <span className="text-[10px] text-[var(--foreground-secondary)]">None Upcoming</span>
            </div>
          </div>

          {/* Shortcuts Card */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)] p-4 flex flex-col gap-3">
            <h4 className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Shortcuts</h4>
            <div className="flex flex-col gap-2">
              <Link href="/employee/calendar" className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-hover)]">
                <span className="flex items-center gap-2">
                  <PortalIcon name="calendar" className="h-4 w-4 text-[var(--accent-primary)]" />
                  My Calendar
                </span>
                <svg className="h-3 w-3 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link href="/employee/attendance" className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-hover)]">
                <span className="flex items-center gap-2">
                  <PortalIcon name="attendance" className="h-4 w-4 text-[var(--accent-primary)]" />
                  Attendance
                </span>
                <svg className="h-3 w-3 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link href="/employee/payslips" className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-hover)]">
                <span className="flex items-center gap-2">
                  <PortalIcon name="payslips" className="h-4 w-4 text-[var(--accent-primary)]" />
                  Latest Payslip
                </span>
                <svg className="h-3 w-3 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link href="/employee/replacement-credit" className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-hover)]">
                <span className="flex items-center gap-2">
                  <PortalIcon name="replacement-credit" className="h-4 w-4 text-[var(--accent-primary)]" />
                  Replacement Credit
                </span>
                <svg className="h-3 w-3 text-[var(--foreground-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
