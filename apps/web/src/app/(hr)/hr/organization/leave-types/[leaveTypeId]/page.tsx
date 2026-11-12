import { redirect } from "next/navigation";

export default async function LeaveTypeDetailPage({
  params,
}: {
  params: Promise<{ leaveTypeId: string }>;
}) {
  const { leaveTypeId } = await params;
  redirect(`/hr/organization/leave-types/${leaveTypeId}/edit`);
}

