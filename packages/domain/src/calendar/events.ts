export type CalendarEventKind = "leave" | "holiday" | "company_event";

export type CalendarDayEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  date: string;
  status?: "pending" | "approved";
  leaveTypeName?: string;
  employeeId?: string;
  employeeName?: string;
  departmentName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  companyEventKind?: string;
  href?: string;
  approvalStepId?: string | null;
  sourceId: string;
  sortKey: string;
};

const KIND_ORDER: Record<CalendarEventKind, number> = {
  holiday: 0,
  company_event: 1,
  leave: 2,
};

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function addDaysIso(date: string, days: number): string {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + days);
  return formatLocalDate(next);
}

export function expandDateRangeToDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }
  return days;
}

export function expandLeaveRequestDays(input: {
  id: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  status: "pending" | "approved";
  leaveTypeName: string;
  employeeName: string;
  employeeId?: string;
  departmentName?: string | null;
  approvalStepId?: string | null;
  href?: string;
}): CalendarDayEvent[] {
  const days = expandDateRangeToDays(input.startDate, input.endDate);
  return days.map((date, index) => {
    const isLast = index === days.length - 1;
    const halfSuffix = input.halfDay && isLast ? " ½" : "";
    return {
      id: `${input.id}:${date}`,
      kind: "leave",
      title: `${input.employeeName} · ${input.leaveTypeName}${halfSuffix}`,
      date,
      status: input.status,
      leaveTypeName: input.leaveTypeName,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      departmentName: input.departmentName ?? null,
      approvalStepId: input.approvalStepId ?? null,
      href: input.href,
      sourceId: input.id,
      sortKey: `leave:${input.id}:${date}`,
    };
  });
}

export function expandHolidayDay(input: {
  id: string;
  name: string;
  holidayDate: string;
  branchId?: string | null;
  branchName?: string | null;
}): CalendarDayEvent {
  return {
    id: `holiday:${input.id}`,
    kind: "holiday",
    title: input.branchName ? `${input.name} (${input.branchName})` : input.name,
    date: input.holidayDate,
    branchId: input.branchId ?? null,
    branchName: input.branchName ?? null,
    sourceId: input.id,
    sortKey: `holiday:${input.id}`,
  };
}

export function expandCompanyEventDays(input: {
  id: string;
  title: string;
  kind: string;
  startDate: string;
  endDate: string;
}): CalendarDayEvent[] {
  return expandDateRangeToDays(input.startDate, input.endDate).map((date) => ({
    id: `company:${input.id}:${date}`,
    kind: "company_event",
    title: input.title,
    date,
    companyEventKind: input.kind,
    sourceId: input.id,
    sortKey: `company:${input.id}:${date}`,
  }));
}

export function mergeEventsForDay(
  _date: string,
  events: CalendarDayEvent[],
): CalendarDayEvent[] {
  return [...events].sort((a, b) => {
    const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.title.localeCompare(b.title);
  });
}

export function calendarMonthBounds(year: number, month: number) {
  const monthStr = String(month).padStart(2, "0");
  const firstDay = `${year}-${monthStr}-01`;
  const lastDate = new Date(year, month, 0);
  const lastDay = `${year}-${monthStr}-${String(lastDate.getDate()).padStart(2, "0")}`;

  let gridStart = firstDay;
  while (parseLocalDate(gridStart).getDay() !== 1) {
    gridStart = addDaysIso(gridStart, -1);
  }

  let gridEnd = lastDay;
  while (parseLocalDate(gridEnd).getDay() !== 0) {
    gridEnd = addDaysIso(gridEnd, 1);
  }

  const weeks: string[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(cursor);
      cursor = addDaysIso(cursor, 1);
    }
    weeks.push(week);
  }

  return { gridStart, gridEnd, weeks };
}

export function isWeekendDate(date: string, weekendMode: "sat_sun" | "fri_sat" | "sun_only"): boolean {
  const day = parseLocalDate(date).getDay();
  switch (weekendMode) {
    case "fri_sat":
      return day === 5 || day === 6;
    case "sun_only":
      return day === 0;
    default:
      return day === 0 || day === 6;
  }
}
