import { listReportEmployees, paginateRows } from "./context";
import type { ReportFilters } from "./types";

export type HeadcountReportRow = Record<string, string | number | null>;

export async function listHeadcountRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: HeadcountReportRow[];
  total: number;
  summary: HeadcountReportRow[];
}> {
  const employees = await listReportEmployees(filters);

  const summaryMap = new Map<string, HeadcountReportRow>();

  for (const employee of employees) {
    const key = `${employee.branchName ?? "Unassigned"}|${employee.departmentName ?? "Unassigned"}|${employee.status}`;
    const existing = summaryMap.get(key);
    if (existing) {
      existing.count = Number(existing.count) + 1;
    } else {
      summaryMap.set(key, {
        branch: employee.branchName,
        department: employee.departmentName,
        status: employee.status,
        count: 1,
      });
    }
  }

  const detailRows: HeadcountReportRow[] = employees.map((employee) => ({
    employeeNumber: employee.employeeNumber,
    employeeName: employee.fullName,
    branch: employee.branchName,
    department: employee.departmentName,
    employmentType: employee.employmentType,
    status: employee.status,
    joinDate: employee.joinDate,
  }));

  const { rows, total } = paginateRows(detailRows, filters);

  return {
    columns: [
      { key: "employeeNumber", label: "Employee #" },
      { key: "employeeName", label: "Employee" },
      { key: "branch", label: "Branch" },
      { key: "department", label: "Department" },
      { key: "employmentType", label: "Employment type" },
      { key: "status", label: "Status" },
      { key: "joinDate", label: "Join date" },
    ],
    rows,
    total,
    summary: [...summaryMap.values()].sort((a, b) =>
      String(a.branch).localeCompare(String(b.branch)),
    ),
  };
}
