import { listEmployeesSchema } from "@hrms/validation";

import { EmployeeList } from "@/components/hr/employees/employee-list";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDirectory } from "@/lib/employees/queries";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; branchId?: string; page?: string }>;
}) {
  await requireRole("hr_administrator");

  const params = await searchParams;
  const filters = listEmployeesSchema.parse({
    search: params.search,
    status: params.status ?? "active",
    branchId: params.branchId ?? "all",
    page: params.page ?? 1,
    pageSize: 10,
  });

  const directory = await getEmployeeDirectory(filters);

  return (
    <EmployeeList
      branchId={filters.branchId}
      branches={directory.branches}
      employees={directory.employees}
      inactiveCount={directory.inactiveCount}
      page={directory.page}
      pageSize={directory.pageSize}
      search={filters.search}
      stats={directory.stats}
      status={filters.status}
      total={directory.total}
    />
  );
}
