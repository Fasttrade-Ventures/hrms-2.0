import { submitOvertime } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrSelect,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Request overtime approval." title="Overtime" />

      <EmployeeRequestForm action={submitOvertime} submitLabel="Submit OT request" title="Overtime request">
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="workDate" label="Work date">
            <HrTextInput defaultValue={today} id="workDate" name="workDate" required type="date" />
          </HrField>
          <HrField id="hours" label="Hours">
            <HrTextInput id="hours" name="hours" placeholder="2.0" required />
          </HrField>
          <HrField id="rateType" label="Rate">
            <HrSelect defaultValue="1.5" id="rateType" name="rateType">
              <option value="1.5">1.5×</option>
              <option value="2.0">2.0×</option>
              <option value="3.0">3.0×</option>
            </HrSelect>
          </HrField>
          <HrField id="reason" label="Reason">
            <HrTextInput id="reason" name="reason" placeholder="Optional" />
          </HrField>
        </div>
      </EmployeeRequestForm>
    </div>
  );
}
