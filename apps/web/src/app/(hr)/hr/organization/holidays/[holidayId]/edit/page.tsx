import { notFound } from "next/navigation";

import { HolidayForm } from "@/components/hr/organization/holidays";
import { requireRole } from "@/lib/auth/session";
import { getHoliday, listBranchOptions } from "@/lib/hr/organization";

export default async function EditHolidayPage({
  params,
}: {
  params: Promise<{ holidayId: string }>;
}) {
  await requireRole("hr_administrator");
  const { holidayId } = await params;
  const [holiday, branches] = await Promise.all([getHoliday(holidayId), listBranchOptions()]);
  if (!holiday) notFound();
  return <HolidayForm branches={branches} holiday={holiday} />;
}
