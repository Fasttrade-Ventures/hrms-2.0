import { isSaasMode } from "@hrms/platform";

import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformDashboardData = {
  deploymentMode: string;
  organizationCount: number;
  organizations: Array<{ id: string; name: string; slug: string | null; createdAt: string }>;
};

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  const supabase = isSaasMode() ? createAdminClient() : await createClient();

  const { data, count, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(DEFAULT_LIST_PAGE_SIZE);

  if (error) throw new Error(error.message);

  return {
    deploymentMode,
    organizationCount: count ?? data?.length ?? 0,
    organizations: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
    })),
  };
}
