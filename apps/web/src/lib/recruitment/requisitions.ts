import { createRequisitionSchema, type CreateRequisitionInput } from "@hrms/validation";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function createRequisition(
  input: CreateRequisitionInput,
  createdByUserId: string,
): Promise<{ requisitionId: string }> {
  const parsed = createRequisitionSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("job_requisitions")
    .insert({
      organization_id: organizationId,
      title: parsed.title.trim(),
      description: parsed.description?.trim() ?? null,
      headcount: parsed.headcount,
      department_id: parsed.departmentId ?? null,
      branch_id: parsed.branchId ?? null,
      employment_type: parsed.employmentType ?? null,
      status: "open",
      created_by: createdByUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create requisition.");
  return { requisitionId: data.id };
}

export async function listRequisitions() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_requisitions")
    .select("id, title, status, headcount, created_at")
    .eq("organization_id", await requireOrganizationId())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
