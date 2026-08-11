import Link from "next/link";
import { EmptyState, ListCard } from "@hrms/ui";
import { submitLateReport } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import { formatDate, RequestStatusPill } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listLateReports } from "@/lib/employee/requests";

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const requests = await listLateReports();

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Report a late arrival for manager review." title="Report Late" />

      <EmployeeRequestForm action={submitLateReport} submitLabel="Submit Report Late" title="Report Late details">
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="requestDate" label="Date">
            <HrTextInput defaultValue={today} id="requestDate" name="requestDate" required type="date" />
          </HrField>
          <HrField id="actualArrivalTime" label="Actual arrival time">
            <HrTextInput defaultValue="09:30" id="actualArrivalTime" name="actualArrivalTime" required type="time" />
          </HrField>
          <HrField id="reason" label="Reason">
            <HrTextInput id="reason" name="reason" placeholder="Optional" />
          </HrField>
        </div>
      </EmployeeRequestForm>

      <ListCard
        columns={[
          { key: "date", label: "Date" },
          { key: "time", label: "Arrival time", className: "w-36" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="Submit your first late report using the form above."
            title="No Report Late requests yet"
          />
        }
        header={
          <p className="text-sm font-medium text-[var(--foreground-primary)]">
            My Report Late requests ({requests.length})
          </p>
        }
        rows={requests.map((request) => ({
          id: request.id,
          cells: {
            date: (
              <div>
                <Link
                  className="font-medium text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                  href={`/employee/report-late/${request.id}`}
                >
                  {formatDate(request.requestDate)}
                </Link>
                {request.reason ? (
                  <p className="text-sm text-[var(--foreground-muted)]">{request.reason}</p>
                ) : null}
              </div>
            ),
            time: request.actualArrivalTime,
            status: <RequestStatusPill status={request.status} />,
          },
          action: (
            <Link
              className="text-sm font-medium text-[var(--accent-primary)]"
              href={`/employee/report-late/${request.id}`}
            >
              View
            </Link>
          ),
        }))}
      />
    </div>
  );
}
