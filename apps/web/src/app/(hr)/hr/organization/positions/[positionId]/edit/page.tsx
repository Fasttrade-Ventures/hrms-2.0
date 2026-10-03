import { notFound } from "next/navigation";

import { PositionForm } from "@/components/hr/organization/positions";
import { requireRole } from "@/lib/auth/session";
import { getPosition, listDepartments } from "@/lib/hr/organization";

export default async function EditPositionPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  await requireRole("hr_administrator");
  const { positionId } = await params;
  const [position, departments] = await Promise.all([
    getPosition(positionId),
    listDepartments(),
  ]);
  if (!position) notFound();
  return <PositionForm departments={departments} position={position} />;
}
