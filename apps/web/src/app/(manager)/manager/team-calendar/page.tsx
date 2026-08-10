import { CalendarShell } from "@/components/calendar/calendar-shell";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listManagerCalendarDays } from "@/lib/calendar/queries";
import { parseYearMonth } from "@/lib/calendar/parse-filters";
import { requireModule } from "@/lib/entitlements";
import { requireManagerContext } from "@/lib/manager/context";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModule("calendar");
  const query = await searchParams;
  const { year, month } = parseYearMonth(query);
  const { organizationId, employeeId } = await requireManagerContext();
  const { events, branchContext } = await listManagerCalendarDays({
    organizationId,
    managerEmployeeId: employeeId,
    year,
    month,
  });

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Direct reports and your own leave, plus branch holidays. Approve pending leave from event details."
        title="Team Calendar"
      />
      <CalendarShell
        basePath="/manager/team-calendar"
        events={events}
        mode="manager"
        month={month}
        printTitle="Team Calendar"
        weekendMode={branchContext.weekendMode}
        year={year}
      />
    </div>
  );
}
