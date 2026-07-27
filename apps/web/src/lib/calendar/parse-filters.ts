import type { HrCalendarFilters } from "./types";

export function parseHrCalendarFilters(searchParams: Record<string, string | string[] | undefined>): HrCalendarFilters {
  const statuses = [searchParams.status].flat().filter((value): value is "pending" | "approved" =>
    value === "pending" || value === "approved",
  );

  return {
    branchId: stringParam(searchParams.branchId) || null,
    departmentId: stringParam(searchParams.departmentId) || null,
    leaveTypeId: stringParam(searchParams.leaveTypeId) || null,
    employeeQuery: stringParam(searchParams.q) || null,
    allBranches: [searchParams.allBranches].flat().includes("true"),
    statuses: statuses.length ? statuses : ["pending", "approved"],
  };
}

function stringParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseYearMonth(searchParams: Record<string, string | string[] | undefined>) {
  const now = new Date();
  const year = Number(stringParam(searchParams.year) || now.getFullYear());
  const month = Number(stringParam(searchParams.month) || now.getMonth() + 1);
  return {
    year: Number.isFinite(year) ? year : now.getFullYear(),
    month: Number.isFinite(month) ? Math.min(12, Math.max(1, month)) : now.getMonth() + 1,
  };
}

export function buildHrCalendarQuery(filters: HrCalendarFilters): string {
  const params = new URLSearchParams();
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.leaveTypeId) params.set("leaveTypeId", filters.leaveTypeId);
  if (filters.employeeQuery) params.set("q", filters.employeeQuery);
  if (filters.allBranches) params.set("allBranches", "true");
  for (const status of filters.statuses ?? []) {
    params.append("status", status);
  }
  return params.toString();
}

export function buildHrCalendarHref(
  year: number,
  month: number,
  filters?: HrCalendarFilters,
): string {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("month", String(month));
  const filterQuery = filters ? buildHrCalendarQuery(filters) : "";
  if (filterQuery) {
    const extra = new URLSearchParams(filterQuery);
    extra.forEach((value, key) => params.set(key, value));
  }
  return `/hr/calendar?${params.toString()}`;
}
