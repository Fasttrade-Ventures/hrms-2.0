import { submitReplacementCredit } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Claim replacement leave credit for working on a rest day." title="Replacement Credit" />

      <EmployeeRequestForm
        action={submitReplacementCredit}
        submitLabel="Submit request"
        title="Replacement Credit"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="workDate" label="Work date">
            <HrTextInput defaultValue={today} id="workDate" name="workDate" required type="date" />
          </HrField>
          <HrField id="creditDays" label="Credit days">
            <HrTextInput defaultValue="1" id="creditDays" name="creditDays" required />
          </HrField>
          <HrField id="description" label="Description">
            <HrTextInput id="description" name="description" placeholder="Optional" />
          </HrField>
        </div>
      </EmployeeRequestForm>
    </div>
  );
}
