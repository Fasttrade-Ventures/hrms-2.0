import { createClient } from "@/lib/supabase/server";
import { getOwnerEntitlementSettings } from "@/lib/owner/entitlements";

export type OwnerModuleRow = {
  key: string;
  label: string;
  tier: "Core" | "Professional" | "Enterprise";
  enabled: boolean;
};

export type OwnerDashboardData = {
  employeeCount: number;
  branchCount: number;
  activePayruns: number;
  modules: OwnerModuleRow[];
  deploymentMode: string;
  productTier: string;
};

export async function getOwnerDashboardData(organizationId: string): Promise<OwnerDashboardData> {
  const supabase = await createClient();
  const [employeesRes, branchesRes, payrunsRes, settings] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("payroll_payruns")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["draft", "in_review", "approved"]),
    getOwnerEntitlementSettings(),
  ]);

  return {
    employeeCount: employeesRes.count ?? 0,
    branchCount: branchesRes.count ?? 0,
    activePayruns: payrunsRes.count ?? 0,
    modules: settings.modules.map((module) => ({
      key: module.key,
      label: module.label,
      tier: module.tier,
      enabled: module.enabled,
    })),
    deploymentMode: process.env.DEPLOYMENT_MODE ?? "standalone",
    productTier: settings.productTier,
  };
}
