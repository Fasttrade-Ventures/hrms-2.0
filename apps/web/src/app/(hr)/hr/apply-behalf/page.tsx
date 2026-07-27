import { applyBehalfListFilterSchema } from "@hrms/validation";

import { ApplyBehalfList } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { listBehalfApplications } from "@/lib/hr/apply-behalf";

export default async function ApplyBehalfPage({
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
  await requireRole("hr_administrator");
  const params = await searchParams;
  const filters = applyBehalfListFilterSchema.parse({
    type: params.type ?? "all",
    dateFrom: params.dateFrom ?? "",
    dateTo: params.dateTo ?? "",
    page: params.page ?? 1,
    pageSize: 15,
  });

  const data = await listBehalfApplications(filters);

  let banner: string | undefined;
  if (params.created === "leave") banner = "Leave submitted on behalf and auto-approved.";
  if (params.created === "late") banner = "Late report submitted on behalf and auto-approved.";

  return (
    <ApplyBehalfList
      banner={banner}
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
