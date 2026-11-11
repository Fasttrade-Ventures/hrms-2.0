"use server";

import {
  getAnalyticsDetail,
  type AnalyticsChartKey,
  type AnalyticsDetail,
} from "@/lib/analytics/queries";
import { parseAnalyticsFilters } from "@/lib/analytics/period";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export async function loadAnalyticsDetailAction(input: {
  chartKey: AnalyticsChartKey;
  segmentKey: string;
  period?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
}): Promise<AnalyticsDetail> {
  await requireModule("analytics");
  await requireRole("hr_administrator", "organization_owner", "director");
  const filters = parseAnalyticsFilters(input);
  return getAnalyticsDetail({
    chartKey: input.chartKey,
    segmentKey: input.segmentKey,
    filters,
  });
}
