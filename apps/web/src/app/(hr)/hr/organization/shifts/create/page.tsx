import { ShiftForm } from "@/components/hr/organization/shifts";
import { requireRole } from "@/lib/auth/session";

export default async function CreateShiftPage() {
  await requireRole("hr_administrator");
  return <ShiftForm />;
}
