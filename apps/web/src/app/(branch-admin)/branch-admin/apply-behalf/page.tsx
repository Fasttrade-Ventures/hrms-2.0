import { applyBehalfListFilterSchema } from "@hrms/validation";

import { ApplyBehalfList } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { listBehalfApplications } from "@/lib/hr/apply-behalf";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";

export default async function BranchApplyBehalfPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    created?: string;
  }>;
}) {
  const context = await requireBranchAdminContext();
  const params = await searchParams;
  const filters = applyBehalfListFilterSchema.parse({
    type: params.type ?? "all",
    dateFrom: params.dateFrom ?? "",
    dateTo: params.dateTo ?? "",
    page: params.page ?? 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
  });

  const data = await listBehalfApplications(filters, { branchIds: context.branchIds });

  let banner: string | undefined;
  if (params.created === "leave") banner = "Leave submitted on behalf and auto-approved.";
  if (params.created === "late") banner = "Late report submitted on behalf and auto-approved.";

  return (
    <ApplyBehalfList
      banner={banner}
      basePath="/branch-admin/apply-behalf"
      data={data}
      dateFrom={filters.dateFrom}
      dateTo={filters.dateTo}
      page={data.page}
      pageSize={data.pageSize}
      total={data.total}
      type={filters.type}
    />
  );
}
