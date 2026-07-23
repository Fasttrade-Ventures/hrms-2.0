import { HolidaysList } from "@/components/hr/organization/holidays";
import { requireRole } from "@/lib/auth/session";
import { listHolidays } from "@/lib/hr/organization";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireRole("hr_administrator");
  const params = await searchParams;
  const year = Number(params.year) || new Date().getFullYear();
  const holidays = await listHolidays(year);
  return <HolidaysList holidays={holidays} year={year} />;
}
