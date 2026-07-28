import { notFound } from "next/navigation";

import { PayrunDetailView } from "@/components/hr/payroll/payrun-detail";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEntitlements, requireModule } from "@/lib/entitlements";
import { getBukucloudSyncStatus } from "@/lib/integrations/bukucloud/sync";
import { getPayrunDetail, listPayrunBranches } from "@/lib/payroll/queries";

export default async function PayrunDetailPage({
  params,
}: {
  params: Promise<{ payrunId: string }>;
}) {
  await requireModule("payroll");
  await requireRole("hr_administrator");
  const { payrunId } = await params;
  const [payrun, branches, entitlements, bukucloudSyncStatus] = await Promise.all([
    getPayrunDetail(payrunId),
    listPayrunBranches(payrunId).catch(() => []),
    getEntitlements(),
    getBukucloudSyncStatus(payrunId),
  ]);

  if (!payrun) notFound();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${payrun.earningPeriodStart} → ${payrun.earningPeriodEnd}`}
        title={`Payrun ${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`}
      />
      <PayrunDetailView
        branches={branches}
        bukucloudSyncStatus={bukucloudSyncStatus}
        integrationsEnabled={entitlements.hasModule("integrations")}
        payrun={payrun}
      />
    </div>
  );
}
