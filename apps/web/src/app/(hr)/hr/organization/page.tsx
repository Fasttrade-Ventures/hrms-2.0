import { OrganizationHub } from "@/components/hr/organization/organization-hub";
import { requireRole } from "@/lib/auth/session";
import { getOrgHubData } from "@/lib/hr/organization";

export default async function OrganizationPage() {
  await requireRole("hr_administrator");
  const data = await getOrgHubData();
  return <OrganizationHub data={data} />;
}
