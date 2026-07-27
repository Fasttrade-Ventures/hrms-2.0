import { notFound } from "next/navigation";

import { ApplyBehalfDetail } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { getBehalfLeaveDetail } from "@/lib/hr/apply-behalf";

export default async function BehalfLeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("hr_administrator");
  const { id } = await params;
  const application = await getBehalfLeaveDetail(id);

  if (!application) {
    notFound();
  }

  return <ApplyBehalfDetail application={application} />;
}
