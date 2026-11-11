import { PoliciesRegister } from "@/components/hr/policies/policies-register";
import { requireRole } from "@/lib/auth/session";
import { listPoliciesForHr } from "@/lib/policies/service";

export default async function PoliciesPage() {
  await requireRole("hr_administrator");
  const policies = await listPoliciesForHr();

  return <PoliciesRegister policies={policies} />;
}
