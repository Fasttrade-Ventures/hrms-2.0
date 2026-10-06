import { ClaimTypesList } from "@/components/hr/organization/claim-types";
import { requireRole } from "@/lib/auth/session";
import { listClaimTypesAdmin } from "@/lib/hr/organization";

export default async function ClaimTypesPage() {
  await requireRole("hr_administrator");
  const claimTypes = await listClaimTypesAdmin();
  return <ClaimTypesList claimTypes={claimTypes} />;
}
