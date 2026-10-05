import { createAdminClient } from "@/lib/supabase/admin";
import { isPastRetention } from "@/lib/audit/record-retention";

export async function performRecordRetention(input?: { asOf?: string; organizationId?: string; dryRun?: boolean }) {
  const asOf = input?.asOf ?? new Date().toISOString();
  const admin = createAdminClient();
  let documentFiles = 0;
  let policyFiles = 0;

  let orgQuery = admin
    .from("organizations")
    .select("id, document_retention_days, policy_retention_days");
  if (input?.organizationId) orgQuery = orgQuery.eq("id", input.organizationId);
  const { data: organizations, error } = await orgQuery;
  if (error) throw new Error(error.message);

  for (const organization of organizations ?? []) {
    if (organization.document_retention_days != null) {
      const { data: documents } = await admin
        .from("employee_documents")
        .select("file_id, created_at")
        .eq("organization_id", organization.id);
      for (const document of documents ?? []) {
        if (
          !isPastRetention({
            asOf,
            retentionDays: organization.document_retention_days,
            recordAt: document.created_at,
          })
        ) {
          continue;
        }
        documentFiles += 1;
        if (!input?.dryRun) {
          await admin
            .from("file_objects")
            .update({ deleted_at: asOf })
            .eq("id", document.file_id)
            .is("deleted_at", null);
        }
      }
    }

    if (organization.policy_retention_days != null) {
      const { data: current } = await admin
        .from("policies")
        .select("file_id")
        .eq("organization_id", organization.id);
      const currentIds = new Set((current ?? []).map((row) => row.file_id).filter(Boolean));
      const { data: files } = await admin
        .from("file_objects")
        .select("id, created_at")
        .eq("organization_id", organization.id)
        .eq("category", "policies")
        .is("deleted_at", null);
      for (const file of files ?? []) {
        if (currentIds.has(file.id)) continue;
        if (
          !isPastRetention({
            asOf,
            retentionDays: organization.policy_retention_days,
            recordAt: file.created_at,
          })
        ) {
          continue;
        }
        policyFiles += 1;
        if (!input?.dryRun) {
          await admin.from("file_objects").update({ deleted_at: asOf }).eq("id", file.id);
        }
      }
    }
  }

  return { documentFiles, policyFiles };
}
