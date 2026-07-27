import { PayGroupsPanel } from "@/components/hr/payroll/pay-groups-panel";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listPayGroups } from "@/lib/payroll/queries";

export default async function PayGroupsPage() {
  requireModule("payroll");
  await requireRole("hr_administrator");
  const payGroups = await listPayGroups();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Pay frequency and cutoff day per group." title="Pay groups" />
      <PayGroupsPanel payGroups={payGroups} />
    </div>
  );
}
