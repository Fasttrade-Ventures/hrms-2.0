import { PAYROLL_SEED_COMPONENTS } from "@hrms/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

const LEAVE_TYPES = [
  { name: "Annual Leave", entitlement_days: 14, requires_attachment: false, is_unpaid: false },
  { name: "Medical Leave", entitlement_days: 14, requires_attachment: true, is_unpaid: false },
  { name: "Hospitalization Leave", entitlement_days: 60, requires_attachment: true, is_unpaid: false },
  { name: "Unpaid Leave", entitlement_days: 0, requires_attachment: false, is_unpaid: true },
] as const;

const CLAIM_TYPES = [
  { name: "Medical", max_amount: 500 },
  { name: "Transport", max_amount: 200 },
  { name: "Meal", max_amount: 100 },
  { name: "Other", max_amount: null },
] as const;

/**
 * Idempotent leave / claim / payroll catalog seed for a single organization.
 * Safe to call on provision and from CLI seed scripts.
 */
export async function seedOrgCatalogs(
  admin: SupabaseClient,
  organizationId: string,
): Promise<{ leaveTypes: number; claimTypes: number; payrollComponents: number }> {
  let leaveTypes = 0;
  let claimTypes = 0;
  let payrollComponents = 0;

  for (const type of LEAVE_TYPES) {
    const { error } = await admin.from("leave_types").upsert(
      { organization_id: organizationId, ...type },
      { onConflict: "organization_id,name", ignoreDuplicates: true },
    );
    if (error && !error.message.includes("duplicate")) {
      throw new Error(`leave_types: ${error.message}`);
    }
    leaveTypes += 1;
  }

  for (const type of CLAIM_TYPES) {
    const { error } = await admin.from("claim_types").upsert(
      { organization_id: organizationId, ...type },
      { onConflict: "organization_id,name", ignoreDuplicates: true },
    );
    if (error && !error.message.includes("duplicate")) {
      throw new Error(`claim_types: ${error.message}`);
    }
    claimTypes += 1;
  }

  const { data: existingComponents } = await admin
    .from("payroll_components")
    .select("code")
    .eq("organization_id", organizationId);
  const existingCodes = new Set((existingComponents ?? []).map((row) => row.code));
  const missingComponents = PAYROLL_SEED_COMPONENTS.filter((component) => !existingCodes.has(component.code));

  if (missingComponents.length > 0) {
    const { error: payrollError } = await admin.from("payroll_components").insert(
      missingComponents.map((component) => ({
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
    );
    if (payrollError) {
      throw new Error(`payroll_components: ${payrollError.message}`);
    }
    payrollComponents = missingComponents.length;
  }

  return { leaveTypes, claimTypes, payrollComponents };
}
