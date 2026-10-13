import { notFound } from "next/navigation";

import { ApplyBehalfDetail } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { getBehalfReplacementDetail } from "@/lib/hr/apply-behalf";

export default async function BehalfReplacementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("hr_administrator");
  const { id } = await params;
  const application = await getBehalfReplacementDetail(id);

  if (!application) {
    notFound();
  }

  return <ApplyBehalfDetail application={application} />;
}
