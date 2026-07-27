import { notFound } from "next/navigation";

import { PayrunDetailView } from "@/components/hr/payroll/payrun-detail";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getPayrunDetail, listPayrunBranches } from "@/lib/payroll/queries";

export default async function PayrunDetailPage({
  params,
}: {
  params: Promise<{ payrunId: string }>;
}) {
  requireModule("payroll");
  await requireRole("hr_administrator");
  const { payrunId } = await params;
  const [payrun, branches] = await Promise.all([
    getPayrunDetail(payrunId),
    listPayrunBranches(payrunId).catch(() => []),
  ]);

  if (!payrun) notFound();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${payrun.earningPeriodStart} → ${payrun.earningPeriodEnd}`}
        title={`Payrun ${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`}
      />
      <PayrunDetailView branches={branches} payrun={payrun} />
    </div>
  );
}
