import { ClaimTypeCreateForm } from "@/components/hr/organization/claim-types";
import { requireRole } from "@/lib/auth/session";

export default async function CreateClaimTypePage() {
  await requireRole("hr_administrator");
  return <ClaimTypeCreateForm />;
}
