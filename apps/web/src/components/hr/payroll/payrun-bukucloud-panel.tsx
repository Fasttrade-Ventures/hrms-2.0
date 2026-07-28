"use client";

import { useActionState } from "react";

import {
  syncPayrunToBukucloudAction,
  type BukucloudActionState,
} from "@/app/(hr)/hr/integrations/bukucloud/actions";
import { HrGhostButton, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { StatusPill } from "@hrms/ui";
import type { BukucloudSyncStatus } from "@/lib/integrations/bukucloud/sync";

const initialState: BukucloudActionState = {};

function syncStatusLabel(status: BukucloudSyncStatus["status"]): string {
  switch (status) {
    case "sent":
      return "Synced";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "not_configured":
      return "Not configured";
    default:
      return "Not synced";
  }
}

function syncStatusTone(status: BukucloudSyncStatus["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

export function PayrunBukucloudPanel({
  payrunId,
  status,
  syncStatus,
  integrationsEnabled,
}: {
  payrunId: string;
  status: string;
  syncStatus: BukucloudSyncStatus;
  integrationsEnabled: boolean;
}) {
  const [syncState, syncAction, syncPending] = useActionState(syncPayrunToBukucloudAction, initialState);
  const [retryState, retryAction, retryPending] = useActionState(syncPayrunToBukucloudAction, initialState);
  const exportable = status === "approved" || status === "locked";

  if (!integrationsEnabled) {
    return (
      <PortalSectionCard title="BukuCloud accounting">
        <p className="text-sm text-muted-foreground">
          Enable the integrations module to post payroll journals to BukuCloud.
        </p>
      </PortalSectionCard>
    );
  }

  if (syncStatus.status === "not_configured") {
    return (
      <PortalSectionCard title="BukuCloud accounting">
        <p className="text-sm text-muted-foreground">
          Configure your tenant API credentials in{" "}
          <a className="text-[var(--accent-primary)] hover:underline" href="/hr/integrations/bukucloud">
            BukuCloud integration settings
          </a>
          .
        </p>
      </PortalSectionCard>
    );
  }

  return (
    <PortalSectionCard title="BukuCloud accounting">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusPill label={syncStatusLabel(syncStatus.status)} tone={syncStatusTone(syncStatus.status)} />
        {syncStatus.referenceNumber ? (
          <span className="text-sm text-muted-foreground">Ref {syncStatus.referenceNumber}</span>
        ) : null}
        {syncStatus.externalJournalId ? (
          <span className="text-sm text-muted-foreground">Journal #{syncStatus.externalJournalId}</span>
        ) : null}
        {syncStatus.syncedAt ? (
          <span className="text-sm text-muted-foreground">
            {new Date(syncStatus.syncedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      {!exportable ? (
        <p className="mb-4 text-sm text-amber-700">Approve the payrun before syncing to BukuCloud.</p>
      ) : null}

      {syncStatus.lastError ? (
        <p className="mb-4 text-sm text-destructive">{syncStatus.lastError}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <form action={syncAction}>
          <input name="payrunId" type="hidden" value={payrunId} />
          <HrPrimaryButton
            disabled={!exportable || syncPending || syncStatus.status === "sent"}
            type="submit"
          >
            {syncPending ? "Syncing…" : syncStatus.status === "sent" ? "Already synced" : "Sync to BukuCloud"}
          </HrPrimaryButton>
        </form>

        {syncStatus.status === "failed" ? (
          <form action={retryAction}>
            <input name="force" type="hidden" value="true" />
            <input name="payrunId" type="hidden" value={payrunId} />
            <HrGhostButton disabled={!exportable || retryPending} type="submit">
              {retryPending ? "Retrying…" : "Retry sync"}
            </HrGhostButton>
          </form>
        ) : null}
      </div>

      {syncState.error || retryState.error ? (
        <p className="mt-3 text-sm text-destructive">{syncState.error ?? retryState.error}</p>
      ) : null}
      {syncState.success || retryState.success ? (
        <p className="mt-3 text-sm text-emerald-600">{syncState.success ?? retryState.success}</p>
      ) : null}
    </PortalSectionCard>
  );
}
