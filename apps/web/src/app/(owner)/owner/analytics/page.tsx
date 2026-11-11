import { Suspense } from "react";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { loadAnalyticsPageData } from "@/lib/analytics/page-data";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; branchId?: string; departmentId?: string }>;
}) {
  await requireModule("analytics");
  await requireRole("organization_owner");
  const params = await searchParams;
  const data = await loadAnalyticsPageData(params);

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading analytics…</p>}>
      <AnalyticsDashboard
        branches={data.branches}
        cockpit={data.cockpit}
        departments={data.departments}
        showRecruitment={data.showRecruitment}
      />
    </Suspense>
  );
}
