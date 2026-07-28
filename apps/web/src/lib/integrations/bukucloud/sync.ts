import { logAuditEvent } from "@/lib/audit/log-event";
import { getPayrunDetail } from "@/lib/payroll/queries";
import { createAdminClient } from "@/lib/supabase/admin";

import { postBukucloudPayroll } from "./client";
import { getBukucloudConnectionConfig } from "./config";
import { buildBukucloudReference, mapPayrunToBukucloudPayload } from "./mapper";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type BukucloudSyncStatus = {
  status: "not_configured" | "pending" | "sent" | "failed" | "not_synced";
  referenceNumber?: string;
  externalJournalId?: string;
  lastError?: string;
  syncedAt?: string;
};

export async function getBukucloudSyncStatus(payrunId: string): Promise<BukucloudSyncStatus> {
  const config = await getBukucloudConnectionConfig();
  if (!config) return { status: "not_configured" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("payroll_integration_syncs")
    .select("status, reference_number, external_journal_id, last_error, synced_at")
    .eq("organization_id", getOrganizationId())
    .eq("payrun_id", payrunId)
    .eq("provider", "bukucloud")
    .maybeSingle();

  if (!data) return { status: "not_synced" };

  return {
    status: data.status as BukucloudSyncStatus["status"],
    referenceNumber: data.reference_number ?? undefined,
    externalJournalId: data.external_journal_id ?? undefined,
    lastError: data.last_error ?? undefined,
    syncedAt: data.synced_at ?? undefined,
  };
}

export async function syncPayrunToBukucloud(input: {
  payrunId: string;
  actorUserId: string | null;
  force?: boolean;
}): Promise<BukucloudSyncStatus> {
  const organizationId = getOrganizationId();
  const config = await getBukucloudConnectionConfig(organizationId);
  if (!config) {
    throw new Error("BukuCloud integration is not configured.");
  }

  const payrun = await getPayrunDetail(input.payrunId);
  if (!payrun) throw new Error("Payrun not found.");
  if (payrun.status !== "locked" && payrun.status !== "approved") {
    throw new Error("Payrun must be approved or locked before syncing to BukuCloud.");
  }

  const admin = createAdminClient();
  const referenceNumber = buildBukucloudReference(input.payrunId);

  if (!input.force) {
    const { data: existing } = await admin
      .from("payroll_integration_syncs")
      .select("status, external_journal_id, reference_number, synced_at")
      .eq("organization_id", organizationId)
      .eq("payrun_id", input.payrunId)
      .eq("provider", "bukucloud")
      .maybeSingle();

    if (existing?.status === "sent") {
      return {
        status: "sent",
        referenceNumber: existing.reference_number ?? referenceNumber,
        externalJournalId: existing.external_journal_id ?? undefined,
        syncedAt: existing.synced_at ?? undefined,
      };
    }
  }

  await admin.from("payroll_integration_syncs").upsert(
    {
      organization_id: organizationId,
      payrun_id: input.payrunId,
      provider: "bukucloud",
      status: "pending",
      reference_number: referenceNumber,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,payrun_id,provider" },
  );

  const payDate = payrun.payDate ?? payrun.earningPeriodEnd;
  if (!payDate) throw new Error("Payrun is missing a pay date.");

  const payload = mapPayrunToBukucloudPayload({
    payrunId: input.payrunId,
    payDate,
    periodLabel: `${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`,
    bankAccountCode: config.bankAccountCode,
    totals: payrun.totals,
  });

  try {
    const response = await postBukucloudPayroll(config, payload);
    const syncedAt = new Date().toISOString();

    await admin
      .from("payroll_integration_syncs")
      .update({
        status: "sent",
        external_journal_id: String(response.journal_entry_id),
        reference_number: response.reference_number ?? referenceNumber,
        last_error: null,
        synced_at: syncedAt,
        updated_at: syncedAt,
      })
      .eq("organization_id", organizationId)
      .eq("payrun_id", input.payrunId)
      .eq("provider", "bukucloud");

    await logAuditEvent({
      organizationId,
      actorUserId: input.actorUserId,
      action: "payroll.bukucloud_sync_completed",
      resourceType: "payroll_payrun",
      resourceId: input.payrunId,
      metadata: {
        journalEntryId: response.journal_entry_id,
        referenceNumber: response.reference_number ?? referenceNumber,
      },
    });

    return {
      status: "sent",
      referenceNumber: response.reference_number ?? referenceNumber,
      externalJournalId: String(response.journal_entry_id),
      syncedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "BukuCloud sync failed.";
    await admin
      .from("payroll_integration_syncs")
      .update({
        status: "failed",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("payrun_id", input.payrunId)
      .eq("provider", "bukucloud");

    await logAuditEvent({
      organizationId,
      actorUserId: input.actorUserId,
      action: "payroll.bukucloud_sync_failed",
      resourceType: "payroll_payrun",
      resourceId: input.payrunId,
      metadata: { error: message },
    });

    throw new Error(message);
  }
}

export async function maybeAutoSyncPayrunToBukucloud(payrunId: string, actorUserId: string | null): Promise<void> {
  const config = await getBukucloudConnectionConfig();
  if (!config?.autoSyncOnLock) return;

  try {
    await syncPayrunToBukucloud({ payrunId, actorUserId });
  } catch {
    // Auto-sync must not block payrun lock.
  }
}
