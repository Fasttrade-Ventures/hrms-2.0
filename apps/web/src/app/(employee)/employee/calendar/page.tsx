import { CalendarShell } from "@/components/calendar/calendar-shell";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listEmployeeCalendarDays } from "@/lib/calendar/queries";
import { parseYearMonth } from "@/lib/calendar/parse-filters";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireModule } from "@/lib/entitlements";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModule("calendar");
  const query = await searchParams;
  const { year, month } = parseYearMonth(query);
  const { organizationId, employeeId } = await requireEmployeeContext();
  const { events, branchContext } = await listEmployeeCalendarDays({
    organizationId,
    employeeId,
    year,
    month,
  });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Your approved and pending leave, plus branch public holidays."
        title="Calendar"
      />
      <CalendarShell
        basePath="/employee/calendar"
        events={events}
        mode="employee"
        month={month}
        printTitle="My Calendar"
        weekendMode={branchContext.weekendMode}
        year={year}
      />
    </div>
  );
}
