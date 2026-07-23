import { BranchesList } from "@/components/hr/organization/branches";
import { requireRole } from "@/lib/auth/session";
import { listBranches } from "@/lib/hr/organization";

export default async function BranchesPage() {
  await requireRole("hr_administrator");
  const branches = await listBranches();
  return <BranchesList branches={branches} />;
}
