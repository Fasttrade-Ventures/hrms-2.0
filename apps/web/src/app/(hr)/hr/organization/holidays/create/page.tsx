import { HolidayForm } from "@/components/hr/organization/holidays";
import { requireRole } from "@/lib/auth/session";
import { listBranchOptions } from "@/lib/hr/organization";

export default async function CreateHolidayPage() {
  await requireRole("hr_administrator");
  const branches = await listBranchOptions();
  return <HolidayForm branches={branches} />;
}
