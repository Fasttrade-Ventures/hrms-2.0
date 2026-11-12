import { redirect } from "next/navigation";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  redirect(`/hr/organization/departments/${departmentId}/edit`);
}

