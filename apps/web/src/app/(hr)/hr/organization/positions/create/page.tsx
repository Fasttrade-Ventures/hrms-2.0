import { PositionForm } from "@/components/hr/organization/positions";
import { requireRole } from "@/lib/auth/session";
import { listDepartments } from "@/lib/hr/organization";

export default async function CreatePositionPage() {
  await requireRole("hr_administrator");
  const departments = await listDepartments();
  return <PositionForm departments={departments} />;
}
