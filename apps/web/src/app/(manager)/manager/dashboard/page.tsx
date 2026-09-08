import Link from "next/link";

import { EmptyState, ListCard, StatusPill, StatCard } from "@hrms/ui";

import { AnnouncementDashboardWidget } from "@/components/announcements/announcement-dashboard-widget";
import { PortalHeroBanner } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalIcon } from "@/components/portal/portal-icons";
import { countPendingApprovals, listManagerApprovals } from "@/lib/manager/approvals";
import { requireManagerContext } from "@/lib/manager/context";
import { countDirectReports } from "@/lib/manager/team";
import {
  getAnnouncementViewer,
  listDashboardAnnouncementItems,
} from "@/lib/announcements/queries";
import { hasModule } from "@/lib/entitlements";
import { firstNameFromFullName, getCurrentEmployeeDetail, greetingForHour } from "@/lib/employees/self";

export default async function Page() {
  const managerContext = await requireManagerContext();
  const hour = new Date().getHours();
  const employee = await getCurrentEmployeeDetail();
  const firstName = firstNameFromFullName(employee?.fullName, employee?.email);

  const [pending, teamSize, queue, announcementFeed] = await Promise.all([
    countPendingApprovals().catch(() => 0),
    countDirectReports().catch(() => 0),
    listManagerApprovals().catch(() => []),
    (async () => {
      if (!(await hasModule("announcements"))) {
        return { pinned: [], latest: [] };
      }
      const viewer = await getAnnouncementViewer({
        organizationId: managerContext.organizationId,
        employeeId: managerContext.employeeId,
        roles: managerContext.session.membership.roles,
      });
      return listDashboardAnnouncementItems({
        organizationId: managerContext.organizationId,
        viewer,
        userId: managerContext.session.user.id,
      }).catch(() => ({ pinned: [], latest: [] }));
    })(),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={
          employee
            ? `${employee.employeeNumber} · Manager${pending > 0 ? ` · ${pending} pending approvals` : ""}`
            : "Team approvals and coverage."
        }
        title={`${greetingForHour(hour)}, ${firstName}`}
      />

      {pending > 0 ? (
        <PortalHeroBanner
          action={
            <Link
              className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-white px-5 text-sm font-semibold text-[var(--accent-primary)] sm:w-auto"
              href="/manager/approvals"
            >
              Review inbox
            </Link>
          }
          description="Leave, claims, OT and late reports from your team."
          title={`${pending} request${pending === 1 ? "" : "s"} need review`}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          hint="Awaiting your decision"
          icon={<PortalIcon name="approvals" />}
          label="Pending approvals"
          value={String(pending)}
        />
        <StatCard
          hint="Active direct reports"
          icon={<PortalIcon name="team-leave" />}
          label="Team size"
          value={String(teamSize)}
        />
        <StatCard
          hint={pending > 0 ? "Action needed" : "All caught up"}
          icon={<PortalIcon name="dashboard" />}
          label="Inbox status"
          value={pending > 0 ? "Review" : "Clear"}
        />
      </div>

      <ListCard
        columns={[
          { key: "request", label: "Request" },
          { key: "summary", label: "Summary" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="New requests from your team will appear here."
            icon={<PortalIcon name="approvals" />}
            title="Approval queue empty"
          />
        }
        header={
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--foreground-primary)]">Approval queue</p>
            <Link
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline whitespace-nowrap"
              href="/manager/approvals"
            >
              View all →
            </Link>
          </div>
        }
        rows={queue.slice(0, 5).map((row) => ({
          id: row.stepId,
          cells: {
            request: (
              <Link
                className="font-medium text-[var(--accent-primary)]"
                href={`/manager/approvals/${row.stepId}`}
              >
                {row.requestTypeLabel} · {row.requesterName}
              </Link>
            ),
            summary: (
              <div>
                <p className="truncate text-sm">{row.summary}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{row.requesterEmployeeNumber}</p>
              </div>
            ),
            status: (
              <StatusPill
                label={row.status === "expired" ? "Expired" : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                tone={
                  row.status === "pending"
                    ? "warning"
                    : row.status === "approved"
                      ? "success"
                      : row.status === "rejected"
                        ? "danger"
                        : "neutral"
                }
              />
            ),
          },
        }))}
      />

      {announcementFeed.latest.length > 0 || announcementFeed.pinned.length > 0 ? (
        <AnnouncementDashboardWidget
          basePath="/manager/announcements"
          items={announcementFeed.latest}
          pinnedItems={announcementFeed.pinned}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
          href="/manager/team-leave"
        >
          Team Leave
        </Link>
        <Link
          className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
          href="/manager/team-attendance"
        >
          Team Attendance
        </Link>
        <Link
          className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
          href="/manager/team-documents"
        >
          Team Documents
        </Link>
        <Link
          className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
          href="/manager/team-calendar"
        >
          Team Calendar
        </Link>
      </div>
    </div>
  );
}
