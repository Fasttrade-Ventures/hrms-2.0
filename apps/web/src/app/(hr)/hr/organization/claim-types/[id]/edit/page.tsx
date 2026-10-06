import { notFound } from "next/navigation";
import { ClaimTypeEditForm } from "@/components/hr/organization/claim-types";
import { requireRole } from "@/lib/auth/session";
import { getClaimTypeAdmin } from "@/lib/hr/organization";

export default async function EditClaimTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("hr_administrator");
  const { id } = await params;
  const claimType = await getClaimTypeAdmin(id);

  if (!claimType) {
    notFound();
  }

  return <ClaimTypeEditForm claimType={claimType} />;
}
