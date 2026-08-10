import Link from "next/link";
import { EmptyState, ListCard } from "@hrms/ui";
import { submitManualAttendance } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import { formatDate, formatDateTime, RequestStatusPill } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAttendanceCorrections } from "@/lib/employee/requests";

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const requests = await listAttendanceCorrections();

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Request manual attendance correction." title="Manual Attendance" />

      <EmployeeRequestForm
        action={submitManualAttendance}
        submitLabel="Submit request"
        title="Manual Attendance request"
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

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "clockIn", label: "Clock In", className: "hidden md:block w-36" },
          { key: "clockOut", label: "Clock Out", className: "hidden md:block w-36" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="Submit your first attendance correction request using the form above."
            title="No Manual Attendance requests yet"
          />
        }
        header={
          <p className="text-sm font-medium text-[var(--foreground-primary)]">
            My Manual Attendance requests ({requests.length})
          </p>
        }
        rows={requests.map((request) => ({
          id: request.id,
          cells: {
            date: (
              <div>
                <Link
                  className="font-medium text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                  href={`/employee/manual-attendance/${request.id}`}
                >
                  {formatDate(request.requestDate)}
                </Link>
                {request.reason ? (
                  <p className="text-sm text-[var(--foreground-muted)]">{request.reason}</p>
                ) : null}
              </div>
            ),
            clockIn: request.clockInTime ? formatDateTime(request.clockInTime) : "—",
            clockOut: request.clockOutTime ? formatDateTime(request.clockOutTime) : "—",
            status: <RequestStatusPill status={request.status} />,
          },
          action: (
            <Link
              className="text-sm font-medium text-[var(--accent-primary)]"
              href={`/employee/manual-attendance/${request.id}`}
            >
              View
            </Link>
          ),
        }))}
      />
    </div>
  );
}
