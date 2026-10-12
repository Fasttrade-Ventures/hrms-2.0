import { notFound } from "next/navigation";

import { ApplyBehalfDetail } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getBehalfClaimDetail } from "@/lib/hr/apply-behalf";

export default async function BranchBehalfClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireBranchAdminContext();
  const { id } = await params;
  const application = await getBehalfClaimDetail(id, { branchIds: context.branchIds });

  if (!application) {
    notFound();
  }

  return (
    <ApplyBehalfDetail application={application} listHref="/branch-admin/apply-behalf" />
  );
}
