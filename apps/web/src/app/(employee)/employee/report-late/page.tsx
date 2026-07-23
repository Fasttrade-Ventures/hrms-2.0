import { submitLateReport } from "@/app/(employee)/employee/actions";
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
      <PortalPageHeader description="Report late arrival for approval." title="Report late" />

      <EmployeeRequestForm action={submitLateReport} submitLabel="Submit report" title="Late arrival report">
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="requestDate" label="Date">
            <HrTextInput defaultValue={today} id="requestDate" name="requestDate" required type="date" />
          </HrField>
          <HrField id="actualArrivalTime" label="Actual arrival time">
            <HrTextInput id="actualArrivalTime" name="actualArrivalTime" required type="time" />
          </HrField>
          <HrField id="reason" label="Reason">
            <HrTextInput id="reason" name="reason" placeholder="Optional" />
          </HrField>
        </div>
      </EmployeeRequestForm>
    </div>
  );
}
