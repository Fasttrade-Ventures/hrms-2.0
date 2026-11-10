import { BranchForm } from "@/components/hr/organization/branches";
import { requireRole } from "@/lib/auth/session";
import { getOrganizationCountry } from "@/lib/hr/organization";

export default async function CreateBranchPage() {
  await requireRole("hr_administrator");
  const country = await getOrganizationCountry();
  return <BranchForm country={country} />;
}
