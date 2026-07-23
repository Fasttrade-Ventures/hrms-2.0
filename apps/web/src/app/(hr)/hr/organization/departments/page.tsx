import { DepartmentsList } from "@/components/hr/organization/departments";
import { requireRole } from "@/lib/auth/session";
import { listDepartments } from "@/lib/hr/organization";

export default async function DepartmentsPage() {
  await requireRole("hr_administrator");
  const departments = await listDepartments();
  return <DepartmentsList departments={departments} />;
}
