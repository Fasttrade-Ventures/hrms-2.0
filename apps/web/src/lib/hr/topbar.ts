import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function getHrTopbarMeta(): Promise<string> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [employeesRes, branchesRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  const employees = employeesRes.count ?? 0;
  const branches = branchesRes.count ?? 0;
  return `Organization-wide · ${employees} employees · ${branches} branches`;
}
