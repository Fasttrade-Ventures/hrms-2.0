import { notFound } from "next/navigation";

import { ApplyBehalfDetail } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getOrganizationDisplay } from "@/lib/organization-display";
import { getBehalfClaimDetail } from "@/lib/hr/apply-behalf";

export default async function BranchBehalfClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireBranchAdminContext();
  const { id } = await params;
  const [application, { currency }] = await Promise.all([
    getBehalfClaimDetail(id, { branchIds: context.branchIds }),
    getOrganizationDisplay(),
  ]);

  if (!application) {
    notFound();
  }

  return (
    <ApplyBehalfDetail
      application={application}
      currency={currency}
      listHref="/branch-admin/apply-behalf"
    />
  );
}
