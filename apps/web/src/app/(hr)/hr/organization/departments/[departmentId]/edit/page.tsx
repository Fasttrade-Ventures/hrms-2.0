import { notFound } from "next/navigation";

import { DepartmentForm } from "@/components/hr/organization/departments";
import { requireRole } from "@/lib/auth/session";
import { getDepartment, listBranchOptions } from "@/lib/hr/organization";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  await requireRole("hr_administrator");
  const { departmentId } = await params;
  const [department, branches] = await Promise.all([
    getDepartment(departmentId),
    listBranchOptions(),
  ]);
  if (!department) notFound();
  return <DepartmentForm branches={branches} department={department} />;
}
