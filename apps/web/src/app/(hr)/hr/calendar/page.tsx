import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { HrCalendarView } from "@/components/calendar/hr-calendar-view";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listHrCalendarDays, listCompanyEventsForHr } from "@/lib/calendar/queries";
import { parseHrCalendarFilters, parseYearMonth } from "@/lib/calendar/parse-filters";
import { requireModule } from "@/lib/entitlements";
import { listBranches, listDepartments, listLeaveTypes } from "@/lib/hr/organization";
import { requireRole } from "@/lib/auth/session";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  requireModule("calendar");
  const session = await requireRole("hr_administrator");
  const query = await searchParams;
  const { year, month } = parseYearMonth(query);
  const filters = parseHrCalendarFilters(query);
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");

  const [events, branches, departments, leaveTypes, companyEvents] = await Promise.all([
    listHrCalendarDays({
      organizationId,
      year,
      month,
      filters,
      actorEmployeeId: session.membership.employeeId,
    }),
    listBranches(),
    listDepartments(),
    listLeaveTypes(),
    listCompanyEventsForHr(),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Org-wide leave, holidays, and company events. Manage holidays under Organization."
        title="Calendar"
      />

      <CalendarFilters
        basePath="/hr/calendar"
        branches={branches.map((row) => ({ id: row.id, name: row.name }))}
        departments={departments.map((row) => ({ id: row.id, name: row.name }))}
        filters={filters}
        leaveTypes={leaveTypes.map((row) => ({ id: row.id, name: row.name }))}
        month={month}
        year={year}
      />

      <HrCalendarView
        branches={branches.map((row) => ({ id: row.id, name: row.name }))}
        companyEvents={companyEvents}
        departments={departments.map((row) => ({ id: row.id, name: row.name }))}
        events={events}
        filters={filters}
        month={month}
        weekendMode="sat_sun"
        year={year}
      />
    </div>
  );
}
