import { notFound } from "next/navigation";

import { ApplyBehalfDetail } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { getOrganizationDisplay } from "@/lib/organization-display";
import { getBehalfClaimDetail } from "@/lib/hr/apply-behalf";

export default async function BehalfClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("hr_administrator");
  const { id } = await params;
  const [application, { currency }] = await Promise.all([
    getBehalfClaimDetail(id),
    getOrganizationDisplay(),
  ]);

  if (!application) {
    notFound();
  }

  return <ApplyBehalfDetail application={application} currency={currency} />;
}
