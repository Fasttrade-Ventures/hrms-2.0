"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  acknowledgeAssetAction,
  createAssetRequestAction,
  type HrActionState,
} from "@/app/(hr)/hr/assets/actions";
import { formatDate } from "@/components/employee/employee-shared";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { MyAssetDetail } from "@/lib/assets/types";

const initialState: HrActionState = {};

function RequestForm({
  assetId,
  kind,
  label,
}: {
  assetId: string;
  kind: "issue" | "return" | "replacement";
  label: string;
}) {
  const bound = createAssetRequestAction.bind(null, assetId);
  const [state, action, pending] = useActionState(bound, initialState);

  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">{label}</p>
      <input name="kind" type="hidden" value={kind} />
      <HrField id={`${kind}-message`} label="Message (optional)">
        <HrTextInput id={`${kind}-message`} name="message" />
      </HrField>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Submitting…" : "Submit request"}
      </HrPrimaryButton>
    </form>
  );
}

export function EmployeeAssetDetail({ asset }: { asset: MyAssetDetail }) {
  const boundAck = acknowledgeAssetAction.bind(null, asset.assignmentId, asset.id);
  const [ackState, ackAction, ackPending] = useActionState(boundAck, initialState);

  return (
    <div className="space-y-6">
      <PortalSectionCard title="Asset details">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">{asset.categoryName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Serial</dt>
            <dd className="font-medium">{asset.serialNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Issued</dt>
            <dd className="font-medium">{formatDate(asset.assignedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Condition</dt>
            <dd className="font-medium capitalize">{asset.condition ?? "—"}</dd>
          </div>
          {asset.warrantyExpiresOn ? (
            <div>
              <dt className="text-muted-foreground">Warranty expires</dt>
              <dd className="font-medium">{formatDate(asset.warrantyExpiresOn)}</dd>
            </div>
          ) : null}
        </dl>
        {asset.fieldSchema.length > 0 ? (
          <div className="mt-4 space-y-2 border-t pt-4">
            {asset.fieldSchema.map((field) => (
              <div key={field.key}>
                <p className="text-muted-foreground text-sm">{field.label}</p>
                <p className="font-medium">{String(asset.customValues[field.key] ?? "—")}</p>
              </div>
            ))}
          </div>
        ) : null}
      </PortalSectionCard>

      {!asset.acknowledgedAt ? (
        <PortalSectionCard title="Acknowledge receipt">
          <form action={ackAction}>
            <p className="mb-3 text-sm text-muted-foreground">
              Confirm you have received this asset in working order.
            </p>
            <HrFormMessage error={ackState.error} success={ackState.success} />
            <HrPrimaryButton disabled={ackPending} type="submit">
              {ackPending ? "Saving…" : "Acknowledge receipt"}
            </HrPrimaryButton>
          </form>
        </PortalSectionCard>
      ) : (
        <p className="text-sm text-emerald-700">Receipt acknowledged on {formatDate(asset.acknowledgedAt)}.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <RequestForm assetId={asset.id} kind="issue" label="Report an issue" />
        <RequestForm assetId={asset.id} kind="return" label="Request return" />
        <RequestForm assetId={asset.id} kind="replacement" label="Request replacement" />
      </div>

      <Link className="text-sm underline" href="/employee/assets">
        Back to my assets
      </Link>
    </div>
  );
}
