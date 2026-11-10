import { BranchesList } from "@/components/hr/organization/branches";
import { requireRole } from "@/lib/auth/session";
import { getOrganizationCountry, listBranches } from "@/lib/hr/organization";

export default async function BranchesPage() {
  await requireRole("hr_administrator");
  const [branches, country] = await Promise.all([listBranches(), getOrganizationCountry()]);
  return <BranchesList branches={branches} country={country} />;
}
