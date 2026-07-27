import { PAYROLL_SEED_COMPONENTS } from "@hrms/domain";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function ensurePayrollComponents(
  supabase: SupabaseServerClient,
  organizationId: string,
): Promise<Map<string, string>> {
  const { data: existing, error: fetchError } = await supabase
    .from("payroll_components")
    .select("id, code")
    .eq("organization_id", organizationId);

  if (fetchError) throw new Error(fetchError.message);

  const componentIdByCode = new Map((existing ?? []).map((row) => [row.code, row.id]));
  const missing = PAYROLL_SEED_COMPONENTS.filter((component) => !componentIdByCode.has(component.code));

  if (missing.length === 0) return componentIdByCode;

  const { data: inserted, error: insertError } = await supabase
    .from("payroll_components")
    .insert(
      missing.map((component) => ({
        organization_id: organizationId,
        code: component.code,
        name: component.name,
        component_type: component.componentType,
        is_epf: component.isEpf,
        is_socso: component.isSocso,
        is_eis: component.isEis,
        is_pcb: component.isPcb,
        is_hrdf: component.isHrdf,
        is_system: component.isSystem,
        is_active: true,
        sort_order: component.sortOrder,
      })),
    )
    .select("id, code");

  if (insertError) throw new Error(insertError.message);

  for (const row of inserted ?? []) {
    componentIdByCode.set(row.code, row.id);
  }

  return componentIdByCode;
}

export async function seedPayrollComponents(organizationId: string): Promise<void> {
  const supabase = await createClient();
  await ensurePayrollComponents(supabase, organizationId);
}
