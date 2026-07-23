import { LeaveTypeForm } from "@/components/hr/organization/leave-types";
import { requireRole } from "@/lib/auth/session";

export default async function CreateLeaveTypePage() {
  await requireRole("hr_administrator");
  return <LeaveTypeForm />;
}
