import { ClaimTypeCreateForm } from "@/components/hr/organization/claim-types";
import { requireRole } from "@/lib/auth/session";
import { getOrganizationDisplay } from "@/lib/organization-display";

export default async function CreateClaimTypePage() {
  await requireRole("hr_administrator");
  const { currency } = await getOrganizationDisplay();
  return <ClaimTypeCreateForm currency={currency} />;
}
