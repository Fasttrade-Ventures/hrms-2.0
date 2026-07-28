import { createHash } from "node:crypto";

import { S3R2StorageAdapter } from "@hrms/platform";

import { computeArchiveCutoff } from "@/lib/audit/siem";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runAuditArchiveJob(asOf: string): Promise<{ archived: number; events: number }> {
  const admin = createAdminClient();
  const { data: organizations, error } = await admin
    .from("organizations")
    .select("id, audit_retention_days, audit_archive_enabled")
    .eq("audit_archive_enabled", true);

  if (error) throw new Error(error.message);

  let archived = 0;
  let events = 0;

  for (const organization of organizations ?? []) {
    const cutoff = computeArchiveCutoff(asOf, organization.audit_retention_days ?? 2555);

    const { data: rows, error: rowsError } = await admin
      .from("audit_events")
      .select("id, action, resource_type, resource_id, actor_user_id, metadata, occurred_at")
      .eq("organization_id", organization.id)
      .lt("occurred_at", cutoff)
      .order("occurred_at", { ascending: true })
      .limit(5000);

    if (rowsError) throw new Error(rowsError.message);
    if (!rows?.length) continue;

    const ndjson = rows.map((row) => JSON.stringify(row)).join("\n");
    const body = new TextEncoder().encode(ndjson);
    const checksum = createHash("sha256").update(body).digest("hex");
    const fileName = `audit-archive-${organization.id.slice(0, 8)}-${asOf}.ndjson`;

    const adapter = new S3R2StorageAdapter();
    const ref = await adapter.putObject({
      organizationId: organization.id,
      category: "audit-archives",
      fileName,
      contentType: "application/x-ndjson",
      body,
    });

    const periodStart = rows[0]!.occurred_at;
    const periodEnd = rows[rows.length - 1]!.occurred_at;

    const { error: archiveError } = await admin.from("audit_event_archives").insert({
      organization_id: organization.id,
      period_start: periodStart,
      period_end: periodEnd,
      storage_key: ref.key,
      event_count: rows.length,
      checksum,
    });

    if (archiveError) throw new Error(archiveError.message);

    const { error: deleteError } = await admin.rpc("delete_archived_audit_events", {
      event_ids: rows.map((row) => row.id),
    });

    if (deleteError) throw new Error(deleteError.message);

    archived += 1;
    events += rows.length;
  }

  return { archived, events };
}
