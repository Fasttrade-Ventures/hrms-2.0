/**
 * Seed default leave and claim types for DEFAULT_ORGANIZATION_ID.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-org-catalogs
 */
import { PAYROLL_SEED_COMPONENTS } from "@hrms/domain";
import { createClient } from "@supabase/supabase-js";

const LEAVE_TYPES = [
  { name: "Annual Leave", entitlement_days: 14, requires_attachment: false, is_unpaid: false },
  { name: "Medical Leave", entitlement_days: 14, requires_attachment: true, is_unpaid: false },
  { name: "Hospitalization Leave", entitlement_days: 60, requires_attachment: true, is_unpaid: false },
  { name: "Unpaid Leave", entitlement_days: 0, requires_attachment: false, is_unpaid: true },
];

const CLAIM_TYPES = [
  { name: "Medical", max_amount: 500 },
  { name: "Transport", max_amount: 200 },
  { name: "Meal", max_amount: 100 },
  { name: "Other", max_amount: null },
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!supabaseUrl || !serviceRoleKey || !organizationId) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEFAULT_ORGANIZATION_ID");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const type of LEAVE_TYPES) {
    const { error } = await admin.from("leave_types").upsert(
      { organization_id: organizationId, ...type },
      { onConflict: "organization_id,name", ignoreDuplicates: true },
    );

    if (error && !error.message.includes("duplicate")) {
      console.error("leave_types:", error.message);
    }
  }

  for (const type of CLAIM_TYPES) {
    const { error } = await admin.from("claim_types").upsert(
      { organization_id: organizationId, ...type },
      { onConflict: "organization_id,name", ignoreDuplicates: true },
    );

    if (error && !error.message.includes("duplicate")) {
      console.error("claim_types:", error.message);
    }
  }

  console.log("Default leave and claim types seeded for org", organizationId);

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
      console.error("payroll_components:", payrollError.message);
      process.exit(1);
    }
  }

  console.log("Payroll component catalog seeded for org", organizationId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
