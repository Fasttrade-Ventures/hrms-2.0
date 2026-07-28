import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import {
  getHeadcountMetrics,
  getLeaveLiabilityMetrics,
  getPayrollCostMetrics,
  getRecruitmentMetrics,
} from "@/lib/analytics/queries";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page() {
  await requireModule("analytics");
  await requireRole("hr_administrator", "organization_owner");

  const [headcount, leave, payroll, recruitment] = await Promise.all([
    getHeadcountMetrics(),
    getLeaveLiabilityMetrics(),
    getPayrollCostMetrics(),
    getRecruitmentMetrics().catch(() => ({ openRequisitions: 0, activeCandidates: 0 })),
  ]);

  return (
    <AnalyticsDashboard headcount={headcount} leave={leave} payroll={payroll} recruitment={recruitment} />
  );
}
