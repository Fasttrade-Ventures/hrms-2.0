import { notFound } from "next/navigation";

import { ApplyBehalfDetail } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { getBehalfClaimDetail } from "@/lib/hr/apply-behalf";

export default async function BehalfClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("hr_administrator");
  const { id } = await params;
  const application = await getBehalfClaimDetail(id);

  if (!application) {
    notFound();
  }

  return <ApplyBehalfDetail application={application} />;
}
