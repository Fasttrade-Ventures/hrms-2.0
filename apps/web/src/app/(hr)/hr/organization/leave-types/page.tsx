import { LeaveTypesList } from "@/components/hr/organization/leave-types";
import { requireRole } from "@/lib/auth/session";
import { listLeaveTypes } from "@/lib/hr/organization";

export default async function LeaveTypesPage() {
  await requireRole("hr_administrator");
  const leaveTypes = await listLeaveTypes();
  return <LeaveTypesList leaveTypes={leaveTypes} />;
}
