import { notFound } from "next/navigation";

import { LeaveTypeForm } from "@/components/hr/organization/leave-types";
import { requireRole } from "@/lib/auth/session";
import { getLeaveType } from "@/lib/hr/organization";

export default async function EditLeaveTypePage({
  params,
}: {
  params: Promise<{ leaveTypeId: string }>;
}) {
  await requireRole("hr_administrator");
  const { leaveTypeId } = await params;
  const leaveType = await getLeaveType(leaveTypeId);
  if (!leaveType) notFound();
  return <LeaveTypeForm leaveType={leaveType} />;
}
