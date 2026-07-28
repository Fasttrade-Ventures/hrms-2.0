import { notFound } from "next/navigation";

import { PayrunDetailView } from "@/components/hr/payroll/payrun-detail";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getPayrunDetail } from "@/lib/payroll/queries";

export default async function DirectorPayrunDetailPage({
  params,
}: {
  params: Promise<{ payrunId: string }>;
}) {
  await requireModule("payroll");
  await requireRole("director");
  const { payrunId } = await params;
  const payrun = await getPayrunDetail(payrunId);
  if (!payrun) notFound();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${payrun.earningPeriodStart} → ${payrun.earningPeriodEnd}`}
        title={`Payrun ${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`}
      />
      <PayrunDetailView backHref="/director/payroll" payrun={payrun} readOnly />
    </div>
  );
}
