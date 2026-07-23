import { DepartmentForm } from "@/components/hr/organization/departments";
import { requireRole } from "@/lib/auth/session";
import { listBranchOptions } from "@/lib/hr/organization";

export default async function CreateDepartmentPage() {
  await requireRole("hr_administrator");
  const branches = await listBranchOptions();
  return <DepartmentForm branches={branches} />;
}
