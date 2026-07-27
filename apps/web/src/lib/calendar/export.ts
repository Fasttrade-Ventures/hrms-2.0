import type { CalendarDayEvent } from "@hrms/domain";

export function calendarEventsToCsv(events: CalendarDayEvent[]): string {
  const header = "date,kind,title,employee_name,status,leave_type,branch,department";
  const rows = events.map((event) =>
    [
      event.date,
      event.kind,
      event.title,
      event.employeeName ?? "",
      event.status ?? "",
      event.leaveTypeName ?? "",
      event.branchName ?? "",
      event.departmentName ?? "",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}
