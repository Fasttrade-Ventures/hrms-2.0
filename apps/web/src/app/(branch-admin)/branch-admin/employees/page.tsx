import { listEmployeesSchema } from "@hrms/validation";

import { EmployeeList } from "@/components/hr/employees/employee-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getEmployeeDirectory } from "@/lib/employees/queries";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const context = await requireBranchAdminContext();
  const params = await searchParams;

  const filters = {
    ...listEmployeesSchema.parse({
      search: params.search,
      status: params.status ?? "active",
      branchId: context.branchIds.length === 1 ? context.branchIds[0] : "all",
      page: params.page ?? 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    }),
    branchIds: context.branchIds,
  };

  const [directory, { data: branchRows }] = await Promise.all([
    getEmployeeDirectory(filters),
    createClient().then((supabase) =>
      supabase.from("branches").select("id, name").in("id", context.branchIds).order("name"),
    ),
  ]);

  const scopedBranches = (branchRows ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    count: directory.branches.find((row) => row.id === branch.id)?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${context.branchName} · branch-scoped employee directory`}
        title="Employees"
      />

      <EmployeeList
        basePath="/branch-admin/employees"
        branchId={context.branchIds.length === 1 ? context.branchIds[0]! : "all"}
        branches={scopedBranches}
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
