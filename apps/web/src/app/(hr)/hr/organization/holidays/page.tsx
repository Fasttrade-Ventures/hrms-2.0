import { HolidaysList } from "@/components/hr/organization/holidays";
import { requireRole } from "@/lib/auth/session";
import { isHolidayYearAllowed } from "@/lib/hr/holiday-window";
import { getHolidayDirectory, listBranchesForImport } from "@/lib/hr/organization";
import { listHolidaysSchema } from "@hrms/validation";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    branchId?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}) {
  await requireRole("hr_administrator");
  const params = await searchParams;
  const requestedYear = Number(params.year) || new Date().getFullYear();
  const year = isHolidayYearAllowed(requestedYear)
    ? requestedYear
    : new Date().getFullYear();

  const filters = listHolidaysSchema.parse({
    year,
    branchId: params.branchId ?? "all",
    sort: params.sort ?? "date",
    order: params.order ?? "asc",
    page: params.page ?? 1,
    pageSize: 15,
  });

  const [directory, branches] = await Promise.all([
    getHolidayDirectory(filters),
    listBranchesForImport(),
  ]);

  return (
    <HolidaysList
      branchId={filters.branchId}
      branches={branches}
      branchFilters={directory.branchFilters}
      holidays={directory.holidays}
      order={filters.order}
      orgWideCount={directory.orgWideCount}
      page={directory.page}
      pageSize={directory.pageSize}
      sort={filters.sort}
      total={directory.total}
      year={year}
      yearTotal={directory.yearTotal}
    />
  );
}
