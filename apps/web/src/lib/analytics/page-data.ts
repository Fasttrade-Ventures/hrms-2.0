import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { getEntitlements } from "@/lib/entitlements";

import { getAnalyticsCockpit } from "./queries";
import { parseAnalyticsFilters } from "./period";

export async function loadAnalyticsPageData(searchParams: {
  period?: string;
  branchId?: string;
  departmentId?: string;
}) {
  const filters = parseAnalyticsFilters(searchParams);
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const entitlements = await getEntitlements();

  const [cockpit, { data: branches }, { data: departments }] = await Promise.all([
    getAnalyticsCockpit(filters),
    supabase.from("branches").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase.from("departments").select("id, name").eq("organization_id", organizationId).order("name"),
  ]);

  return {
    cockpit,
    branches: (branches ?? []).map((row) => ({ id: row.id, name: row.name })),
    departments: (departments ?? []).map((row) => ({ id: row.id, name: row.name })),
    showRecruitment: entitlements.hasModule("recruitment"),
  };
}
