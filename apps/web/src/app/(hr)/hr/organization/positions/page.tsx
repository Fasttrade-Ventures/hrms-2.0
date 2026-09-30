import { PositionsList } from "@/components/hr/organization/positions";
import { requireRole } from "@/lib/auth/session";
import { listPositions } from "@/lib/hr/organization";

export default async function PositionsPage() {
  await requireRole("hr_administrator");
  const positions = await listPositions();
  return <PositionsList positions={positions} />;
}
