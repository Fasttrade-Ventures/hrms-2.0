import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";

const SPECIALIST_FLAGS = ["recruiter", "document_custodian", "asset_manager"] as const;

export async function getSpecialistAccess(employeeId: string): Promise<string[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_memberships")
    .select("permissions")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .maybeSingle();
  return (data?.permissions ?? []).filter((permission: string) =>
    SPECIALIST_FLAGS.includes(permission as (typeof SPECIALIST_FLAGS)[number]),
  );
}

export async function updateSpecialistAccess(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const employeeId = String(formData.get("employeeId") ?? "");
  const selected = SPECIALIST_FLAGS.filter((flag) => formData.get(flag) === "on");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_memberships")
    .select("id, permissions")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This employee has no login yet.");

  const kept = (data.permissions ?? []).filter(
    (permission: string) => !SPECIALIST_FLAGS.includes(permission as (typeof SPECIALIST_FLAGS)[number]),
  );
  const { error: updateError } = await admin
    .from("organization_memberships")
    .update({ permissions: [...kept, ...selected] })
    .eq("id", data.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/hr/employees/${employeeId}`);
}
