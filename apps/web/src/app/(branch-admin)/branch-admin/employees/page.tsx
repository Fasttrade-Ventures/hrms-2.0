import { listEmployeesSchema } from "@hrms/validation";

import { EmployeeList } from "@/components/hr/employees/employee-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getEmployeeDirectory } from "@/lib/employees/queries";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const context = await requireBranchAdminContext();
  const params = await searchParams;

  const filters = listEmployeesSchema.parse({
    search: params.search,
    status: params.status ?? "active",
    branchId: context.branchId,
    page: params.page ?? 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
  });

  const directory = await getEmployeeDirectory(filters);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${context.branchName} · branch-scoped employee directory`}
        title="Employees"
      />

      <EmployeeList
        basePath="/branch-admin/employees"
        branchId={context.branchId}
        branches={directory.branches.filter((branch) => branch.id === context.branchId)}
        employees={directory.employees}
        inactiveCount={directory.inactiveCount}
        page={directory.page}
        pageSize={directory.pageSize}
        readOnly
        search={filters.search}
        stats={directory.stats}
        status={filters.status}
        total={directory.total}
      />
    </div>
  );
}
