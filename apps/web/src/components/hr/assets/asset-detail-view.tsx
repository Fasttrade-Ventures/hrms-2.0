"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  assignAssetAction,
  disposeAssetAction,
  resolveAssetRequestAction,
  returnAssetAction,
  updateAssetAction,
  type HrActionState,
} from "@/app/(hr)/hr/assets/actions";
import { AssetCustomFields } from "@/components/hr/assets/asset-custom-fields";
import { AssetStatusBadge } from "@/components/hr/assets/asset-register-filters";
import { formatDate } from "@/components/employee/employee-shared";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { AssetCategoryRow, AssetDetail } from "@/lib/assets/types";

const initialState: HrActionState = {};

function RequestResolveRow({
  request,
  assetId,
}: {
  request: AssetDetail["openRequests"][number];
  assetId: string;
}) {
  const boundResolve = resolveAssetRequestAction.bind(null, request.id, assetId);
  const [, action] = useActionState(boundResolve, initialState);

  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="font-medium capitalize">{request.kind}</p>
        <p className="text-sm text-muted-foreground">{request.employeeName}</p>
        {request.message ? <p className="text-sm">{request.message}</p> : null}
      </div>
      <form action={action}>
        <HrPrimaryButton type="submit">Resolve</HrPrimaryButton>
      </form>
    </li>
  );
}

export function AssetDetailView({
  asset,
  categories,
  branches,
  employees,
}: {
  asset: AssetDetail;
  categories: AssetCategoryRow[];
  branches: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  const boundUpdate = updateAssetAction.bind(null, asset.id);
  const boundDispose = disposeAssetAction.bind(null, asset.id);
  const [updateState, updateFormAction, updatePending] = useActionState(boundUpdate, initialState);
  const [assignState, assignFormAction, assignPending] = useActionState(assignAssetAction, initialState);
  const [returnState, returnFormAction, returnPending] = useActionState(returnAssetAction, initialState);
  const [disposeState, disposeFormAction, disposePending] = useActionState(boundDispose, initialState);

  const fieldSchema = categories.find((item) => item.id === asset.categoryId)?.fieldSchema ?? asset.fieldSchema;

  return (
    <div className="space-y-6">
      <PortalSectionCard title="Summary">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <AssetStatusBadge status={asset.status} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current assignee</p>
            <p className="font-medium">{asset.assigneeName ?? "Unassigned"}</p>
            {asset.assignedAt ? <p className="text-sm text-muted-foreground">Since {formatDate(asset.assignedAt)}</p> : null}
            {asset.acknowledgedAt ? (
              <p className="text-sm text-emerald-700">Acknowledged {formatDate(asset.acknowledgedAt)}</p>
            ) : asset.assigneeName ? (
              <p className="text-sm text-amber-700">Awaiting employee acknowledgement</p>
            ) : null}
          </div>
        </div>
      </PortalSectionCard>

      <PortalSectionCard title="Edit asset">
        <form action={updateFormAction} className="space-y-4">
          <input name="customValuesJson" type="hidden" value={JSON.stringify(asset.customValues)} />
          <HrField id="name" label="Asset name">
            <HrTextInput defaultValue={asset.name} id="name" name="name" required />
          </HrField>
          <HrField id="categoryId" label="Category">
            <HrSelect defaultValue={asset.categoryId} id="categoryId" name="categoryId" required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </HrSelect>
          </HrField>
          <AssetCustomFields defaultValues={asset.customValues} fieldSchema={fieldSchema} />
          <HrField id="serialNumber" label="Serial number">
            <HrTextInput defaultValue={asset.serialNumber ?? ""} id="serialNumber" name="serialNumber" />
          </HrField>
          <HrFormMessage error={updateState.error} success={updateState.success} />
          <HrPrimaryButton disabled={updatePending} type="submit">
            {updatePending ? "Saving…" : "Save changes"}
          </HrPrimaryButton>
        </form>
      </PortalSectionCard>

      {asset.status !== "disposed" ? (
        <PortalSectionCard title={asset.assigneeName ? "Reassign asset" : "Assign asset"}>
          <form action={assignFormAction} className="space-y-4">
            <input name="assetId" type="hidden" value={asset.id} />
            <HrField id="employeeId" label="Employee">
              <HrSelect id="employeeId" name="employeeId" required>
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_number} · {employee.full_name}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <HrField id="assignedAt" label="Assigned date">
              <HrTextInput defaultValue={new Date().toISOString().slice(0, 10)} id="assignedAt" name="assignedAt" type="date" />
            </HrField>
            <HrFormMessage error={assignState.error} success={assignState.success} />
            <HrPrimaryButton disabled={assignPending} type="submit">
              {assignPending ? "Assigning…" : asset.assigneeName ? "Reassign" : "Assign"}
            </HrPrimaryButton>
          </form>
        </PortalSectionCard>
      ) : null}

      {asset.activeAssignmentId ? (
        <PortalSectionCard title="Return asset">
          <form action={returnFormAction} className="space-y-4">
            <input name="assignmentId" type="hidden" value={asset.activeAssignmentId} />
            <HrField id="returnedAt" label="Return date">
              <HrTextInput defaultValue={new Date().toISOString().slice(0, 10)} id="returnedAt" name="returnedAt" type="date" />
            </HrField>
            <HrField id="destination" label="Destination">
              <HrSelect defaultValue="to_inventory" id="destination" name="destination">
                <option value="to_inventory">Return to inventory</option>
                <option value="pending_inspection">Pending inspection</option>
              </HrSelect>
            </HrField>
            <HrFormMessage error={returnState.error} success={returnState.success} />
            <HrPrimaryButton disabled={returnPending} type="submit">
              {returnPending ? "Returning…" : "Mark returned"}
            </HrPrimaryButton>
          </form>
        </PortalSectionCard>
      ) : null}

      {asset.status !== "disposed" && !asset.activeAssignmentId ? (
        <PortalSectionCard title="Dispose asset">
          <form action={disposeFormAction}>
            <HrFormMessage error={disposeState.error} success={disposeState.success} />
            <HrPrimaryButton disabled={disposePending} type="submit">
              {disposePending ? "Disposing…" : "Mark disposed"}
            </HrPrimaryButton>
          </form>
        </PortalSectionCard>
      ) : null}

      {asset.openRequests.length > 0 ? (
        <PortalSectionCard title="Open employee requests">
          <ul className="space-y-3">
            {asset.openRequests.map((request) => (
              <RequestResolveRow key={request.id} assetId={asset.id} request={request} />
            ))}
          </ul>
        </PortalSectionCard>
      ) : null}

      <PortalSectionCard title="Assignment history">
        <ul className="space-y-3">
          {asset.assignments.map((assignment) => (
            <li key={assignment.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {assignment.employeeId ? (
                      <Link className="underline" href={`/hr/employees/${assignment.employeeId}`}>
                        {assignment.employeeName}
                      </Link>
                    ) : (
                      assignment.employeeName
                    )}
                    {assignment.employeeNumber ? (
                      <span className="text-muted-foreground"> · {assignment.employeeNumber}</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(assignment.assignedAt)}
                    {assignment.returnedAt ? ` → ${formatDate(assignment.returnedAt)}` : " → Present"}
                  </p>
                </div>
                {assignment.acknowledgedAt ? (
                  <span className="text-xs text-emerald-700">Acknowledged</span>
                ) : !assignment.returnedAt ? (
                  <span className="text-xs text-amber-700">Not acknowledged</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </PortalSectionCard>
    </div>
  );
}
