import { createAdminClient } from "@/lib/supabase/admin";

import { parseBankResponse } from "./parse-response";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function reconcilePayoutBatchFromUpload(input: {
  batchId: string;
  content: string;
  uploadedBy: string;
}): Promise<{ matched: number; updated: number }> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { data: batch } = await admin
    .from("payrun_payout_batches")
    .select("id, bank_format")
    .eq("id", input.batchId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!batch) throw new Error("Payout batch not found.");

  const parsed = parseBankResponse(batch.bank_format, input.content);
  const { data: items } = await admin
    .from("payrun_payout_items")
    .select("id, reference")
    .eq("batch_id", batch.id);

  let updated = 0;
  for (const row of parsed) {
    const item = (items ?? []).find((i) => i.reference === row.reference);
    if (!item) continue;
    await admin
      .from("payrun_payout_items")
      .update({
        status: row.status,
        failure_reason: row.failureReason ?? null,
        paid_at: row.status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    updated += 1;
  }

  await admin.from("payout_reconciliation_uploads").insert({
    organization_id: organizationId,
    batch_id: batch.id,
    file_path: `upload://${batch.id}/${Date.now()}.txt`,
    parsed_rows: parsed.length,
    uploaded_by: input.uploadedBy,
  });

  await admin
    .from("payrun_payout_batches")
    .update({ status: "reconciled", reconciled_at: new Date().toISOString() })
    .eq("id", batch.id);

  return { matched: parsed.length, updated };
}

export async function updatePayoutItemStatus(
  itemId: string,
  status: "pending" | "submitted" | "paid" | "failed",
  failureReason?: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("payrun_payout_items")
    .update({
      status,
      failure_reason: failureReason ?? null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}
