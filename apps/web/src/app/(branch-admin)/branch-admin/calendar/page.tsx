import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { HrCalendarView } from "@/components/calendar/hr-calendar-view";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { listHrCalendarDays, listCompanyEventsForHr } from "@/lib/calendar/queries";
import { parseHrCalendarFilters, parseYearMonth } from "@/lib/calendar/parse-filters";
import { requireModule } from "@/lib/entitlements";
import { listDepartments, listLeaveTypes } from "@/lib/hr/organization";
import { createClient } from "@/lib/supabase/server";

export default async function BranchCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModule("calendar");
  const context = await requireBranchAdminContext();
  const query = await searchParams;
  const { year, month } = parseYearMonth(query);
  const filters = {
    ...parseHrCalendarFilters(query),
    branchId: context.branchIds.length === 1 ? context.branchIds[0]! : null,
    branchIds: context.branchIds,
    allBranches: false,
  };

  const supabase = await createClient();
  const [{ data: branchRows }, events, departments, leaveTypes, companyEvents] = await Promise.all([
    supabase.from("branches").select("id, name").in("id", context.branchIds).order("name"),
    listHrCalendarDays({
      organizationId: context.organizationId,
      year,
      month,
      filters,
      actorEmployeeId: context.employeeId,
    }),
    listDepartments(),
    listLeaveTypes(),
    listCompanyEventsForHr(),
  ]);

  const branches = (branchRows ?? []).map((row) => ({ id: row.id, name: row.name }));

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${context.branchName} leave calendar (branch-scoped)`}
        title="Calendar"
      />

      <CalendarFilters
        basePath="/branch-admin/calendar"
        branches={branches}
        departments={departments.map((row) => ({ id: row.id, name: row.name }))}
        filters={filters}
        leaveTypes={leaveTypes.map((row) => ({ id: row.id, name: row.name }))}
        month={month}
        year={year}
      />

      <HrCalendarView
        branches={branches}
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
