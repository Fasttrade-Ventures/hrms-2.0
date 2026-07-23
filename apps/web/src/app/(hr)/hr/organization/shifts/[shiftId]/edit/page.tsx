import { notFound } from "next/navigation";

import { ShiftForm } from "@/components/hr/organization/shifts";
import { requireRole } from "@/lib/auth/session";
import { getShift } from "@/lib/hr/organization";

export default async function EditShiftPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  await requireRole("hr_administrator");
  const { shiftId } = await params;
  const shift = await getShift(shiftId);
  if (!shift) notFound();
  return <ShiftForm shift={shift} />;
}
