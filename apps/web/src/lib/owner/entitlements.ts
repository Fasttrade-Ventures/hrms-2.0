import type { ModuleKey, ProductTier } from "@hrms/platform";
import {
  CORE_MODULES,
  ENTERPRISE_MODULES,
  PROFESSIONAL_MODULES,
  isSaasMode,
  tierIncludesModule,
} from "@hrms/platform";

import { logAuditEvent } from "@/lib/audit/log-event";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";


export type OwnerModuleSetting = {
  key: ModuleKey;
  label: string;
  tier: "Core" | "Professional" | "Enterprise";
  enabled: boolean;
  locked: boolean;
};

const MODULE_LABELS: Record<ModuleKey, string> = {
  announcements: "Announcements",
  calendar: "Calendar",
  documents: "Documents",
  assets: "Assets",
  performance: "Performance",
  payroll: "Payroll",
  ot: "Overtime",
  claims: "Claims",
  replacement: "Replacement credit",
  location: "GPS / location",
  import: "Bulk import",
  payouts: "Payouts",
  audit: "Audit",
  api: "API access",
  analytics: "Analytics",
  recruitment: "Recruitment",
  integrations: "Integrations",
};

async function saveOrganizationSettings(
  organizationId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save organization settings.");
  }
}

function tierForModule(key: ModuleKey): OwnerModuleSetting["tier"] {
  if (ENTERPRISE_MODULES.includes(key)) return "Enterprise";
  if (PROFESSIONAL_MODULES.includes(key)) return "Professional";
  return "Core";
}

export async function getOwnerEntitlementSettings(): Promise<{
  productTier: ProductTier;
  modules: OwnerModuleSetting[];
  payrollDutySegregation: boolean;
}> {
  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("organizations")
    .select("product_tier, module_flags, payroll_duty_segregation")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Organization not found.");

  const flags = (data.module_flags ?? {}) as Partial<Record<ModuleKey, boolean>>;
  const allModules = [...CORE_MODULES, ...PROFESSIONAL_MODULES, ...ENTERPRISE_MODULES];

  const modules = allModules.map((key) => {
    const included = tierIncludesModule(data.product_tier, key);
    const explicit = flags[key];
    return {
      key,
      label: MODULE_LABELS[key],
      tier: tierForModule(key),
      enabled: included && (explicit === undefined ? true : explicit),
      locked: !included,
    };
  });

  return {
    productTier: data.product_tier,
    modules,
    payrollDutySegregation: Boolean(data.payroll_duty_segregation),
  };
}

export async function updateOwnerPayrollDutySegregation(
  enabled: boolean,
  actorUserId?: string | null,
): Promise<void> {
  const organizationId = await requireOrganizationId();

  await saveOrganizationSettings(organizationId, { payroll_duty_segregation: enabled });

  await logAuditEvent({
    actorUserId: actorUserId ?? null,
    action: "organization.payroll_duty_segregation_updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { enabled },
  });
}

export async function updateOwnerModuleFlag(
  module: ModuleKey,
  enabled: boolean,
  actorUserId?: string | null,
): Promise<void> {
  if (isSaasMode()) {
    throw new Error("Module flags can only be changed by Platform in SaaS mode.");
  }

  const supabase = await createClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await supabase
    .from("organizations")
    .select("module_flags, product_tier")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Organization not found.");

  if (!tierIncludesModule(data.product_tier, module)) {
    throw new Error("This feature is not included in the current package.");
  }

  const moduleFlags = {
    ...((data.module_flags ?? {}) as Record<string, boolean>),
    [module]: enabled,
  };

  await saveOrganizationSettings(organizationId, { module_flags: moduleFlags });

  await logAuditEvent({
    actorUserId: actorUserId ?? null,
    action: "organization.module_flag_updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { module, enabled },
  });
}

export async function updateOwnerProductTier(
  tier: ProductTier,
  actorUserId?: string | null,
): Promise<void> {
  if (isSaasMode()) {
    throw new Error("Product tier can only be changed by Platform in SaaS mode.");
  }

  const organizationId = await requireOrganizationId();

  await saveOrganizationSettings(organizationId, { product_tier: tier });

  await logAuditEvent({
    actorUserId: actorUserId ?? null,
    action: "organization.tier_updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { tier },
  });
}
