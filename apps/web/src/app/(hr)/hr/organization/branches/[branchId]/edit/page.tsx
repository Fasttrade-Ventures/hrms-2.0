import { notFound } from "next/navigation";

import { BranchForm } from "@/components/hr/organization/branches";
import { requireRole } from "@/lib/auth/session";
import { getBranch } from "@/lib/hr/organization";

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  await requireRole("hr_administrator");
  const { branchId } = await params;
  const branch = await getBranch(branchId);
  if (!branch) notFound();
  return <BranchForm branch={branch} />;
}
