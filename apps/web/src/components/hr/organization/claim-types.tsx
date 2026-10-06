"use client";

import { useActionState, useState } from "react";
import {
  createClaimType,
  deleteClaimType,
  updateClaimType,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrField,
  HrSelect,
  HrTextInput,
  OrgDeleteButton,
  OrgFormActions,
  OrgFormCard,
  OrgStatCards,
  OrgTableCell,
  OrgTableEditLink,
  OrgTableRow,
  OrgTableShell,
  OrgTableStatus,
} from "@/components/hr/organization/org-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { ClaimTypeRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function ClaimTypesList({ claimTypes }: { claimTypes: ClaimTypeRow[] }) {
  const mileageCount = claimTypes.filter((row) => row.isMileage).length;
  const taxableCount = claimTypes.filter((row) => row.payrollTreatment === "taxable").length;
  const reimbCount = claimTypes.filter((row) => row.payrollTreatment === "reimbursement").length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/claim-types/create">Add claim type</HrLinkButton>
          </div>
        }
        description="Expense claim categories, mileage travel calculation rates, and payroll tax treatment."
        title="Claim types"
      />

      <OrgStatCards
        items={[
          { label: "Claim types", value: claimTypes.length, hint: "configured" },
          { label: "Mileage enabled", value: mileageCount, hint: "rate per km" },
          { label: "Taxable claims", value: taxableCount, hint: "payroll feeds" },
          { label: "Reimbursements", value: reimbCount, hint: "tax-exempt" },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create claim types so employees can submit expenses and mileage claims."
        emptyTitle="No claim types yet"
        headers={["Name", "Calculation Mode", "Default Rate / Max Limit", "Payroll Treatment", "Claims", "Status", "Action"]}
        isEmpty={claimTypes.length === 0}
      >
        {claimTypes.map((claimType) => (
          <OrgTableRow key={claimType.id}>
            <OrgTableCell variant="name">{claimType.name}</OrgTableCell>
            <OrgTableCell>
              {claimType.isMileage ? (
                <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                  Mileage (Distance)
                </span>
              ) : (
                <span className="text-xs text-[var(--foreground-muted)]">Standard receipt</span>
              )}
            </OrgTableCell>
            <OrgTableCell variant="muted">
              {claimType.isMileage
                ? `RM ${Number(claimType.ratePerKm ?? 0).toFixed(2)} / km`
                : claimType.maxAmount != null
                  ? `Max RM ${claimType.maxAmount.toFixed(2)}`
                  : "No limit"}
            </OrgTableCell>
            <OrgTableCell variant="muted">
              <span className="capitalize">{claimType.payrollTreatment}</span>
            </OrgTableCell>
            <OrgTableCell variant="muted">{claimType.claimsCount}</OrgTableCell>
            <OrgTableStatus />
            <OrgTableEditLink href={`/hr/organization/claim-types/${claimType.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function ClaimTypeCreateForm() {
  const [state, formAction, pending] = useActionState(createClaimType, initialState);
  const [isMileage, setIsMileage] = useState(false);

  return (
    <OrgFormCard
      backHref="/hr/organization/claim-types"
      description="Add a new expense or mileage claim policy."
      title="Create claim type"
    >
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <HrField id="name" label="Claim type name">
              <HrTextInput
                id="name"
                name="name"
                placeholder="e.g. Mileage (Car), Medical, Transport"
                required
              />
            </HrField>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                checked={isMileage}
                className="mt-1 size-4 rounded border border-input"
                id="isMileage"
                name="isMileage"
                type="checkbox"
                onChange={(e) => setIsMileage(e.target.checked)}
              />
              <span className="space-y-0.5">
                <span className="font-medium text-foreground">Enable distance-based mileage calculation</span>
                <span className="block text-xs text-muted-foreground">
                  Calculate total automatically based on origin, destination, and distance.
                </span>
              </span>
            </label>
          </div>

          {isMileage ? (
            <HrField id="ratePerKm" label="Reimbursement rate per km (RM)">
              <HrTextInput
                defaultValue="0.80"
                id="ratePerKm"
                min="0.01"
                name="ratePerKm"
                placeholder="0.80"
                required
                step="0.0001"
                type="number"
              />
            </HrField>
          ) : (
            <HrField id="maxAmount" label="Maximum claim amount (RM)">
              <HrTextInput
                id="maxAmount"
                min="0"
                name="maxAmount"
                placeholder="Leave blank for no limit"
                step="0.01"
                type="number"
              />
            </HrField>
          )}

          <HrField id="payrollTreatment" label="Payroll tax treatment">
            <HrSelect defaultValue="taxable" id="payrollTreatment" name="payrollTreatment">
              <option value="taxable">Taxable earning (PCB / EPF eligible)</option>
              <option value="reimbursement">Reimbursement (Non-taxable)</option>
              <option value="exclude">Exclude from payroll</option>
            </HrSelect>
          </HrField>
        </div>

        <OrgFormActions
          cancelHref="/hr/organization/claim-types"
          error={state.error}
          pending={pending}
          submitLabel="Create claim type"
          success={state.success}
        />
      </form>
    </OrgFormCard>
  );
}

export function ClaimTypeEditForm({ claimType }: { claimType: ClaimTypeRow }) {
  const boundUpdate = updateClaimType.bind(null, claimType.id);
  const boundDelete = deleteClaimType.bind(null, claimType.id);
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);
  const [isMileage, setIsMileage] = useState(claimType.isMileage);

  return (
    <OrgFormCard
      backHref="/hr/organization/claim-types"
      description={`Configure ${claimType.name} policy and rates.`}
      title="Edit claim type"
    >
      <form action={formAction} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <HrField id="name" label="Claim type name">
              <HrTextInput
                defaultValue={claimType.name}
                id="name"
                name="name"
                placeholder="e.g. Mileage (Car), Medical, Transport"
                required
              />
            </HrField>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                checked={isMileage}
                className="mt-1 size-4 rounded border border-input"
                id="isMileage"
                name="isMileage"
                type="checkbox"
                onChange={(e) => setIsMileage(e.target.checked)}
              />
              <span className="space-y-0.5">
                <span className="font-medium text-foreground">Enable distance-based mileage calculation</span>
                <span className="block text-xs text-muted-foreground">
                  Calculate total automatically based on origin, destination, and distance.
                </span>
              </span>
            </label>
          </div>

          {isMileage ? (
            <HrField id="ratePerKm" label="Reimbursement rate per km (RM)">
              <HrTextInput
                defaultValue={claimType.ratePerKm != null ? String(claimType.ratePerKm) : "0.80"}
                id="ratePerKm"
                min="0.01"
                name="ratePerKm"
                placeholder="0.80"
                required
                step="0.0001"
                type="number"
              />
            </HrField>
          ) : (
            <HrField id="maxAmount" label="Maximum claim amount (RM)">
              <HrTextInput
                defaultValue={claimType.maxAmount != null ? String(claimType.maxAmount) : ""}
                id="maxAmount"
                min="0"
                name="maxAmount"
                placeholder="Leave blank for no limit"
                step="0.01"
                type="number"
              />
            </HrField>
          )}

          <HrField id="payrollTreatment" label="Payroll tax treatment">
            <HrSelect defaultValue={claimType.payrollTreatment} id="payrollTreatment" name="payrollTreatment">
              <option value="taxable">Taxable earning (PCB / EPF eligible)</option>
              <option value="reimbursement">Reimbursement (Non-taxable)</option>
              <option value="exclude">Exclude from payroll</option>
            </HrSelect>
          </HrField>
        </div>

        <OrgFormActions
          cancelHref="/hr/organization/claim-types"
          error={state.error}
          extra={
            claimType.claimsCount === 0 ? (
              <OrgDeleteButton
                confirmDescription="Are you sure you want to delete this claim type? This action cannot be undone."
                confirmTitle="Delete claim type"
                label="Delete claim type"
                onDelete={boundDelete}
                redirectHref="/hr/organization/claim-types"
              />
            ) : undefined
          }
          pending={pending}
          submitLabel="Save changes"
          success={state.success}
        />
      </form>
    </OrgFormCard>
  );
}
