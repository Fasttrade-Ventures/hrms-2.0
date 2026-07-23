import { listEmployeesSchema } from "@hrms/validation";

import { EmployeeList } from "@/components/hr/employees/employee-list";
import { requireRole } from "@/lib/auth/session";
import { listEmployees } from "@/lib/employees/queries";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  await requireRole("hr_administrator");

  const params = await searchParams;
  const filters = listEmployeesSchema.parse({
    search: params.search,
    status: params.status ?? "active",
  });

  const employees = await listEmployees(filters);

  return <EmployeeList employees={employees} search={filters.search} status={filters.status} />;
}
