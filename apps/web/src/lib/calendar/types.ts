import type { CalendarDayEvent } from "@hrms/domain";

export type CalendarPortalMode = "employee" | "manager" | "hr";

export type HrCalendarFilters = {
  branchId?: string | null;
  departmentId?: string | null;
  statuses?: Array<"pending" | "approved">;
  leaveTypeId?: string | null;
  employeeQuery?: string | null;
  allBranches?: boolean;
};

export type EmployeeBranchContext = {
  branchId: string | null;
  weekendMode: "sat_sun" | "fri_sat" | "sun_only";
};

export type CompanyEventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: "training" | "office_closure" | "town_hall" | "other";
  startDate: string;
  endDate: string;
  branchId: string | null;
  targetDepartmentIds: string[];
};

export function groupEventsByDate(events: CalendarDayEvent[]): Map<string, CalendarDayEvent[]> {
  const map = new Map<string, CalendarDayEvent[]>();
  for (const event of events) {
    const bucket = map.get(event.date) ?? [];
    bucket.push(event);
    map.set(event.date, bucket);
  }
  for (const [date, dayEvents] of map) {
    map.set(date, dayEvents);
  }
  return map;
}
