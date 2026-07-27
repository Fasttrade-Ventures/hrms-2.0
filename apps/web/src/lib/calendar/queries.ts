import {
  calendarMonthBounds,
  expandCompanyEventDays,
  expandHolidayDay,
  expandLeaveRequestDays,
  mergeEventsForDay,
  type CalendarDayEvent,
} from "@hrms/domain";

import { createClient } from "@/lib/supabase/server";

import type { CompanyEventRow, EmployeeBranchContext, HrCalendarFilters } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

type LeaveRow = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  half_day: boolean;
  status: string;
  approval_request_id: string | null;
  leave_types: { name: string } | { name: string }[] | null;
  employees:
    | {
        full_name: string;
        branch_id: string | null;
        department_id: string | null;
        departments: { name: string } | { name: string }[] | null;
      }
    | Array<{
        full_name: string;
        branch_id: string | null;
        department_id: string | null;
        departments: { name: string } | { name: string }[] | null;
      }>
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchPendingStepIds(input: {
  organizationId: string;
  approverEmployeeId: string;
  approvalRequestIds: string[];
}): Promise<Map<string, string>> {
  if (!input.approvalRequestIds.length) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_steps")
    .select("id, approval_request_id")
    .eq("organization_id", input.organizationId)
    .eq("approver_employee_id", input.approverEmployeeId)
    .eq("status", "pending")
    .in("approval_request_id", input.approvalRequestIds);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.approval_request_id, row.id);
  }
  return map;
}

function expandLeaveRows(
  rows: LeaveRow[],
  options: {
    hrefFor?: (row: LeaveRow) => string;
    stepIdFor?: (row: LeaveRow) => string | null;
    titleFor?: (row: LeaveRow, employeeName: string, leaveTypeName: string) => string;
  },
): CalendarDayEvent[] {
  const events: CalendarDayEvent[] = [];

  for (const row of rows) {
    if (row.status !== "pending" && row.status !== "approved") continue;
    const employee = first(row.employees);
    const leaveType = first(row.leave_types);
    const employeeName = employee?.full_name ?? "Employee";
    const leaveTypeName = leaveType?.name ?? "Leave";
    const department = first(employee?.departments);
    const title =
      options.titleFor?.(row, employeeName, leaveTypeName) ??
      `${employeeName} · ${leaveTypeName}`;

    const expanded = expandLeaveRequestDays({
      id: row.id,
      startDate: row.start_date,
      endDate: row.end_date,
      halfDay: row.half_day,
      status: row.status as "pending" | "approved",
      leaveTypeName,
      employeeName,
      employeeId: row.employee_id,
      departmentName: department?.name ?? null,
      approvalStepId: options.stepIdFor?.(row) ?? null,
      href: options.hrefFor?.(row),
    });

    if (options.titleFor) {
      for (const event of expanded) {
        event.title = title + (event.title.includes("½") ? " ½" : "");
      }
    }

    events.push(...expanded);
  }

  return events;
}

async function fetchHolidays(input: {
  organizationId: string;
  rangeStart: string;
  rangeEnd: string;
  branchId?: string | null;
  allBranches?: boolean;
}): Promise<CalendarDayEvent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("holidays")
    .select("id, name, holiday_date, branch_id, branches(name)")
    .eq("organization_id", input.organizationId)
    .gte("holiday_date", input.rangeStart)
    .lte("holiday_date", input.rangeEnd);

  if (!input.allBranches && input.branchId) {
    query = query.or(`branch_id.is.null,branch_id.eq.${input.branchId}`);
  }

  const { data, error } = await query.order("holiday_date");
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const branch = first(row.branches as { name: string } | { name: string }[] | null);
    return expandHolidayDay({
      id: row.id,
      name: row.name,
      holidayDate: row.holiday_date,
      branchId: row.branch_id,
      branchName: branch?.name ?? null,
    });
  });
}

async function fetchLeaveRows(input: {
  organizationId: string;
  rangeStart: string;
  rangeEnd: string;
  employeeIds?: string[];
  filters?: HrCalendarFilters;
}): Promise<LeaveRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leave_requests")
    .select(
      "id, employee_id, start_date, end_date, half_day, status, approval_request_id, leave_types(name), employees(full_name, branch_id, department_id, departments(name))",
    )
    .eq("organization_id", input.organizationId)
    .in("status", input.filters?.statuses?.length ? input.filters.statuses : ["pending", "approved"])
    .lte("start_date", input.rangeEnd)
    .gte("end_date", input.rangeStart);

  if (input.employeeIds?.length) {
    query = query.in("employee_id", input.employeeIds);
  }

  if (input.filters?.leaveTypeId) {
    query = query.eq("leave_type_id", input.filters.leaveTypeId);
  }

  const { data, error } = await query.order("start_date");
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as LeaveRow[];

  if (input.filters?.branchId) {
    rows = rows.filter((row) => first(row.employees)?.branch_id === input.filters?.branchId);
  }

  if (input.filters?.departmentId) {
    rows = rows.filter((row) => first(row.employees)?.department_id === input.filters?.departmentId);
  }

  if (input.filters?.employeeQuery?.trim()) {
    const q = input.filters.employeeQuery.trim().toLowerCase();
    rows = rows.filter((row) => first(row.employees)?.full_name.toLowerCase().includes(q));
  }

  return rows;
}

async function fetchCompanyEvents(input: {
  organizationId: string;
  rangeStart: string;
  rangeEnd: string;
}): Promise<CalendarDayEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .select("id, title, kind, start_date, end_date")
    .eq("organization_id", input.organizationId)
    .lte("start_date", input.rangeEnd)
    .gte("end_date", input.rangeStart)
    .order("start_date");

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) =>
    expandCompanyEventDays({
      id: row.id,
      title: row.title,
      kind: row.kind,
      startDate: row.start_date,
      endDate: row.end_date,
    }),
  );
}

function finalizeEvents(events: CalendarDayEvent[]): CalendarDayEvent[] {
  const byDate = new Map<string, CalendarDayEvent[]>();
  for (const event of events) {
    const bucket = byDate.get(event.date) ?? [];
    bucket.push(event);
    byDate.set(event.date, bucket);
  }

  const merged: CalendarDayEvent[] = [];
  for (const [date, dayEvents] of byDate) {
    merged.push(...mergeEventsForDay(date, dayEvents));
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export async function getEmployeeBranchContext(employeeId: string): Promise<EmployeeBranchContext> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("branch_id, branches(weekend_mode)")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const branch = first(data?.branches as { weekend_mode: string } | { weekend_mode: string }[] | null);
  const weekendMode = (branch?.weekend_mode ?? "sat_sun") as EmployeeBranchContext["weekendMode"];

  return {
    branchId: data?.branch_id ?? null,
    weekendMode,
  };
}

export async function listEmployeeCalendarDays(input: {
  organizationId: string;
  employeeId: string;
  year: number;
  month: number;
}): Promise<{ events: CalendarDayEvent[]; branchContext: EmployeeBranchContext }> {
  const { gridStart, gridEnd } = calendarMonthBounds(input.year, input.month);
  const branchContext = await getEmployeeBranchContext(input.employeeId);

  const [leaveRows, holidays] = await Promise.all([
    fetchLeaveRows({
      organizationId: input.organizationId,
      rangeStart: gridStart,
      rangeEnd: gridEnd,
      employeeIds: [input.employeeId],
    }),
    fetchHolidays({
      organizationId: input.organizationId,
      rangeStart: gridStart,
      rangeEnd: gridEnd,
      branchId: branchContext.branchId,
    }),
  ]);

  const leaveEvents = expandLeaveRows(leaveRows, {
    hrefFor: (row) => `/employee/leave/${row.id}`,
    titleFor: (_row, _name, leaveTypeName) => leaveTypeName,
  });

  return {
    branchContext,
    events: finalizeEvents([...holidays, ...leaveEvents]),
  };
}

export async function listManagerCalendarDays(input: {
  organizationId: string;
  managerEmployeeId: string;
  year: number;
  month: number;
}): Promise<{ events: CalendarDayEvent[]; branchContext: EmployeeBranchContext }> {
  const { gridStart, gridEnd } = calendarMonthBounds(input.year, input.month);
  const branchContext = await getEmployeeBranchContext(input.managerEmployeeId);
  const supabase = await createClient();

  const { data: reports, error: reportsError } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("manager_employee_id", input.managerEmployeeId)
    .eq("status", "active");

  if (reportsError) throw new Error(reportsError.message);

  const employeeIds = [...(reports ?? []).map((row) => row.id), input.managerEmployeeId];
  const leaveRows = await fetchLeaveRows({
    organizationId: input.organizationId,
    rangeStart: gridStart,
    rangeEnd: gridEnd,
    employeeIds,
  });

  const approvalRequestIds = leaveRows
    .map((row) => row.approval_request_id)
    .filter((id): id is string => Boolean(id));
  const stepIds = await fetchPendingStepIds({
    organizationId: input.organizationId,
    approverEmployeeId: input.managerEmployeeId,
    approvalRequestIds,
  });

  const leaveEvents = expandLeaveRows(leaveRows, {
    hrefFor: (row) => {
      if (row.employee_id === input.managerEmployeeId) {
        return `/employee/leave/${row.id}`;
      }
      const stepId = stepIds.get(row.approval_request_id ?? "");
      return stepId ? `/manager/approvals/${stepId}` : "/manager/team-leave";
    },
    stepIdFor: (row) => stepIds.get(row.approval_request_id ?? "") ?? null,
  });

  const holidays = await fetchHolidays({
    organizationId: input.organizationId,
    rangeStart: gridStart,
    rangeEnd: gridEnd,
    branchId: branchContext.branchId,
  });

  return {
    branchContext,
    events: finalizeEvents([...holidays, ...leaveEvents]),
  };
}

export async function listHrCalendarDays(input: {
  organizationId: string;
  year: number;
  month: number;
  filters?: HrCalendarFilters;
  actorEmployeeId?: string | null;
}): Promise<CalendarDayEvent[]> {
  const { gridStart, gridEnd } = calendarMonthBounds(input.year, input.month);
  const filters = input.filters ?? {};

  const [leaveRows, holidays, companyEvents] = await Promise.all([
    fetchLeaveRows({
      organizationId: input.organizationId,
      rangeStart: gridStart,
      rangeEnd: gridEnd,
      filters,
    }),
    fetchHolidays({
      organizationId: input.organizationId,
      rangeStart: gridStart,
      rangeEnd: gridEnd,
      branchId: filters.allBranches ? null : filters.branchId,
      allBranches: filters.allBranches,
    }),
    fetchCompanyEvents({
      organizationId: input.organizationId,
      rangeStart: gridStart,
      rangeEnd: gridEnd,
    }),
  ]);

  const approvalRequestIds = leaveRows
    .map((row) => row.approval_request_id)
    .filter((id): id is string => Boolean(id));
  const stepIds = input.actorEmployeeId
    ? await fetchPendingStepIds({
        organizationId: input.organizationId,
        approverEmployeeId: input.actorEmployeeId,
        approvalRequestIds,
      })
    : new Map<string, string>();

  const leaveEvents = expandLeaveRows(leaveRows, {
    hrefFor: (row) => {
      const stepId = stepIds.get(row.approval_request_id ?? "");
      if (row.status === "pending") {
        return stepId
          ? `/hr/calendar?leaveStep=${stepId}`
          : `/hr/apply-behalf/leave/${row.id}`;
      }
      return `/hr/employees/${row.employee_id}`;
    },
    stepIdFor: (row) => stepIds.get(row.approval_request_id ?? "") ?? null,
  });

  return finalizeEvents([...holidays, ...companyEvents, ...leaveEvents]);
}

export async function listCompanyEventsForHr(): Promise<CompanyEventRow[]> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_events")
    .select("id, title, description, kind, start_date, end_date, branch_id, target_department_ids")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    startDate: row.start_date,
    endDate: row.end_date,
    branchId: row.branch_id,
    targetDepartmentIds: row.target_department_ids ?? [],
  }));
}

export { calendarMonthBounds };
