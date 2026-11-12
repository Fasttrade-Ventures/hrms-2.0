import { redirect } from "next/navigation";

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  redirect(`/hr/organization/branches/${branchId}/edit`);
}

