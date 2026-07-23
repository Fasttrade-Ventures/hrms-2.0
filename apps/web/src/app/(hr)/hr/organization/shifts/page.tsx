import { ShiftsList } from "@/components/hr/organization/shifts";
import { requireRole } from "@/lib/auth/session";
import { listShifts } from "@/lib/hr/organization";

export default async function ShiftsPage() {
  await requireRole("hr_administrator");
  const shifts = await listShifts();
  return <ShiftsList shifts={shifts} />;
}
