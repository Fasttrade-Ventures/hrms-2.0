import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { assertDocumentUpload, uploadOrganizationFile } from "@/lib/files/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  employeesMissingAcknowledgement,
  needsAcknowledgement,
} from "@/lib/policies/acknowledgements";

export type PolicyListItem = {
  id: string;
  title: string;
  version: number;
  fileId: string | null;
  publishedAt: string;
  acknowledged: boolean;
  missingCount: number;
};

async function readPdf(formData: FormData): Promise<{ name: string; type: string; body: Uint8Array }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Attach a PDF.");
  }
  assertDocumentUpload({ name: file.name, type: file.type || "application/pdf", size: file.size });
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Policy files must be PDF.");
  }
  return {
    name: file.name,
    type: file.type || "application/pdf",
    body: new Uint8Array(await file.arrayBuffer()),
  };
}

export async function listPoliciesForEmployee(): Promise<PolicyListItem[]> {
  const { organizationId, employeeId } = await requireEmployeeContext();
  const admin = createAdminClient();
  const { data: policies, error } = await admin
    .from("policies")
    .select("id, title, version, file_id, published_at")
    .eq("organization_id", organizationId)
    .order("title");
  if (error) throw new Error(error.message);

  const ids = (policies ?? []).map((row) => row.id);
  const { data: acks } = ids.length
    ? await admin
        .from("policy_acknowledgements")
        .select("policy_id, version")
        .eq("organization_id", organizationId)
        .eq("employee_id", employeeId)
        .in("policy_id", ids)
    : { data: [] };

  return (policies ?? []).map((policy) => {
    const acknowledgedVersion =
      (acks ?? [])
        .filter((ack) => ack.policy_id === policy.id)
        .map((ack) => Number(ack.version))
        .sort((a, b) => b - a)[0] ?? null;
    return {
      id: policy.id,
      title: policy.title,
      version: policy.version,
      fileId: policy.file_id,
      publishedAt: policy.published_at,
      acknowledged: !needsAcknowledgement({
        policyId: policy.id,
        policyVersion: policy.version,
        acknowledgedVersion,
      }),
      missingCount: 0,
    };
  });
}

export async function listPoliciesForHr(): Promise<Array<PolicyListItem & { missingNames: string[] }>> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const admin = createAdminClient();

  const [{ data: policies, error }, { data: employees, error: employeeError }, { data: acks, error: ackError }] =
    await Promise.all([
      admin.from("policies").select("id, title, version, file_id, published_at").eq("organization_id", organizationId).order("title"),
      admin.from("employees").select("id, full_name, status").eq("organization_id", organizationId),
      admin.from("policy_acknowledgements").select("policy_id, employee_id, version").eq("organization_id", organizationId),
    ]);
  if (error) throw new Error(error.message);
  if (employeeError) throw new Error(employeeError.message);
  if (ackError) throw new Error(ackError.message);

  return (policies ?? []).map((policy) => {
    const missing = employeesMissingAcknowledgement(
      (employees ?? []).map((employee) => ({
        id: employee.id,
        status: employee.status,
        name: employee.full_name,
      })),
      (acks ?? [])
        .filter((ack) => ack.policy_id === policy.id)
        .map((ack) => ({ employeeId: ack.employee_id, version: Number(ack.version) })),
      policy.version,
    );
    return {
      id: policy.id,
      title: policy.title,
      version: policy.version,
      fileId: policy.file_id,
      publishedAt: policy.published_at,
      acknowledged: missing.length === 0,
      missingCount: missing.length,
      missingNames: missing.map((employee) => employee.name),
    };
  });
}

export async function publishPolicy(formData: FormData): Promise<void> {
  const session = await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const title = String(formData.get("title") ?? "").trim();
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!title && !policyId) throw new Error("Enter a policy title.");

  const pdf = await readPdf(formData);
  const fileId = await uploadOrganizationFile({
    organizationId,
    category: "policies",
    fileName: pdf.name,
    contentType: pdf.type,
    body: pdf.body,
    uploadedByUserId: session.user.id,
  });

  const admin = createAdminClient();
  if (!policyId) {
    const { error } = await admin.from("policies").insert({
      organization_id: organizationId,
      title,
      version: 1,
      file_id: fileId,
    });
    if (error) throw new Error(error.message);
  } else {
    const { data: existing, error: existingError } = await admin
      .from("policies")
      .select("id, version, title")
      .eq("id", policyId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Policy not found.");

    const { error } = await admin
      .from("policies")
      .update({
        title: title || existing.title,
        version: Number(existing.version) + 1,
        file_id: fileId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", policyId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/hr/policies");
  revalidatePath("/employee/policies");
}

export async function acknowledgePolicy(formData: FormData): Promise<void> {
  const { organizationId, employeeId } = await requireEmployeeContext();
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!policyId) throw new Error("Policy is required.");

  const admin = createAdminClient();
  const { data: policy, error } = await admin
    .from("policies")
    .select("id, version")
    .eq("id", policyId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!policy) throw new Error("Policy not found.");

  const { error: insertError } = await admin.from("policy_acknowledgements").upsert(
    {
      organization_id: organizationId,
      policy_id: policy.id,
      employee_id: employeeId,
      version: policy.version,
    },
    { onConflict: "policy_id,employee_id,version", ignoreDuplicates: true },
  );
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/employee/policies");
  revalidatePath("/hr/policies");
}
