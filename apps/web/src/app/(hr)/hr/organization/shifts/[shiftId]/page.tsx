import { redirect } from "next/navigation";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  redirect(`/hr/organization/shifts/${shiftId}/edit`);
}

