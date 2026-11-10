import { notFound } from "next/navigation";
import { ClaimTypeEditForm } from "@/components/hr/organization/claim-types";
import { requireRole } from "@/lib/auth/session";
import { getClaimTypeAdmin } from "@/lib/hr/organization";
import { getOrganizationDisplay } from "@/lib/organization-display";

export default async function EditClaimTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("hr_administrator");
  const { id } = await params;
  const [claimType, { currency }] = await Promise.all([
    getClaimTypeAdmin(id),
    getOrganizationDisplay(),
  ]);

  if (!claimType) {
    notFound();
  }

  return <ClaimTypeEditForm claimType={claimType} currency={currency} />;
}
