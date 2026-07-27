import type { CreatePayGroupInput, UpdatePayGroupInput } from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function listPayrollComponents() {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payroll_components")
    .select("id, code, name, component_type, is_system, is_active, sort_order")
    .eq("organization_id", getOrganizationId())
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setPayrollComponentActive(componentId: string, isActive: boolean) {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const { error } = await supabase
    .from("payroll_components")
    .update({ is_active: isActive })
    .eq("id", componentId)
    .eq("organization_id", getOrganizationId());
  if (error) throw new Error(error.message);
}

export async function listStatutoryRuleVersions() {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("statutory_rule_versions")
    .select("id, rule_set, effective_from, effective_to, source_url")
    .order("effective_from", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listBranchesForSettings() {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("organization_id", getOrganizationId())
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPayGroup(input: CreatePayGroupInput) {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pay_groups")
    .insert({
      organization_id: getOrganizationId(),
      name: input.name,
      cycle: input.cycle,
      cutoff_day: input.cutoffDay,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updatePayGroup(groupId: string, input: UpdatePayGroupInput) {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pay_groups")
    .update({
      name: input.name,
      cycle: input.cycle,
      cutoff_day: input.cutoffDay,
    })
    .eq("id", groupId)
    .eq("organization_id", getOrganizationId());
  if (error) throw new Error(error.message);
}

export async function deletePayGroup(groupId: string) {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [{ count: employeeCount, error: employeeError }, { count: payrunCount, error: payrunError }] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("pay_group_id", groupId),
      supabase
        .from("payroll_payruns")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("pay_group_id", groupId),
    ]);

  if (employeeError) throw new Error(employeeError.message);
  if (payrunError) throw new Error(payrunError.message);
  if ((employeeCount ?? 0) > 0) {
    throw new Error("Cannot delete a pay group that still has employees assigned.");
  }
  if ((payrunCount ?? 0) > 0) {
    throw new Error("Cannot delete a pay group that has payruns on record.");
  }

  const { error } = await supabase
    .from("pay_groups")
    .delete()
    .eq("id", groupId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}
