import { submitManualAttendance } from "@/app/(employee)/employee/actions";
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
      <PortalPageHeader description="Request manual attendance correction." title="Manual attendance" />

      <EmployeeRequestForm
        action={submitManualAttendance}
        submitLabel="Submit request"
        title="Manual attendance request"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="requestDate" label="Date">
            <HrTextInput defaultValue={today} id="requestDate" name="requestDate" required type="date" />
          </HrField>
          <HrField id="clockInTime" label="Clock in time">
            <HrTextInput id="clockInTime" name="clockInTime" type="time" />
          </HrField>
          <HrField id="clockOutTime" label="Clock out time">
            <HrTextInput id="clockOutTime" name="clockOutTime" type="time" />
          </HrField>
          <HrField id="reason" label="Reason">
            <HrTextInput id="reason" name="reason" placeholder="Optional" />
          </HrField>
        </div>
      </EmployeeRequestForm>
    </div>
  );
}
