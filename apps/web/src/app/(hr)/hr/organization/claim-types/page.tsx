import { ClaimTypesList } from "@/components/hr/organization/claim-types";
import { requireRole } from "@/lib/auth/session";
import { listClaimTypesAdmin } from "@/lib/hr/organization";
import { getOrganizationDisplay } from "@/lib/organization-display";

export default async function ClaimTypesPage() {
  await requireRole("hr_administrator");
  const [claimTypes, { currency }] = await Promise.all([
    listClaimTypesAdmin(),
    getOrganizationDisplay(),
  ]);
  return <ClaimTypesList claimTypes={claimTypes} currency={currency} />;
}
