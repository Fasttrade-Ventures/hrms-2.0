import { BranchForm } from "@/components/hr/organization/branches";
import { requireRole } from "@/lib/auth/session";

export default async function CreateBranchPage() {
  await requireRole("hr_administrator");
  return <BranchForm />;
}
