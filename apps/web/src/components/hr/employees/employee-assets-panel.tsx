import Link from "next/link";
import { useActionState } from "react";

import { returnAssetAction, type HrActionState } from "@/app/(hr)/hr/assets/actions";
import { formatDate } from "@/components/employee/employee-shared";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { EmployeeAssetAssignmentRow } from "@/lib/assets/types";

const initialState: HrActionState = {};

function ReturnInlineForm({
  assignmentId,
  redirectTo,
}: {
  assignmentId: string;
  redirectTo: string;
}) {
  const [state, action, pending] = useActionState(returnAssetAction, initialState);

  return (
    <form action={action} className="space-y-2">
      <input name="assignmentId" type="hidden" value={assignmentId} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <input name="returnedAt" type="hidden" value={new Date().toISOString().slice(0, 10)} />
      <input name="destination" type="hidden" value="to_inventory" />
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Returning…" : "Mark returned"}
      </HrPrimaryButton>
    </form>
  );
}

export function EmployeeAssetsPanel({
  employeeId,
  employeeStatus,
  assignments,
}: {
  employeeId: string;
  employeeStatus: string;
  assignments: EmployeeAssetAssignmentRow[];
}) {
  if (assignments.length === 0) return null;

  const showWarning = employeeStatus === "terminated" || employeeStatus === "inactive";

  return (
    <PortalSectionCard title="Assigned assets">
      {showWarning ? (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          {assignments.length} asset{assignments.length === 1 ? "" : "s"} still assigned — complete returns
          during offboarding.
        </p>
      ) : null}
      <ul className="space-y-3">
        {assignments.map((assignment) => (
          <li key={assignment.assignmentId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">
                <Link className="underline" href={`/hr/assets/${assignment.assetId}`}>
                  {assignment.assetName}
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                {assignment.categoryName}
                {assignment.serialNumber ? ` · ${assignment.serialNumber}` : ""} · Issued{" "}
                {formatDate(assignment.assignedAt)}
              </p>
              {!assignment.acknowledgedAt ? (
                <p className="text-xs text-amber-700">Not yet acknowledged by employee</p>
              ) : null}
            </div>
            <ReturnInlineForm
              assignmentId={assignment.assignmentId}
              redirectTo={`/hr/employees/${employeeId}`}
            />
          </li>
        ))}
      </ul>
    </PortalSectionCard>
  );
}
