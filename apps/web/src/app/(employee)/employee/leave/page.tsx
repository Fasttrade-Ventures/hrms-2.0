import Link from "next/link";

import { EmptyState, ListCard, StatCard } from "@hrms/ui";

import { LeaveApplyForm } from "@/components/employee/leave-apply-form";
import { formatDate, RequestStatusPill } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import {
  getLeaveBalances,
  listLeaveRequests,
  listLeaveTypes,
} from "@/lib/employee/leave";

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const [leaveTypes, requests, balances] = await Promise.all([
    listLeaveTypes(),
    listLeaveRequests(),
    getLeaveBalances(),
  ]);

  const annualBalance = balances.find((row) => row.leaveTypeName === "Annual Leave");

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Check balances and submit leave requests."
        title="Leave"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {balances.slice(0, 4).map((balance) => (
          <StatCard
            hint={`${balance.usedDays} used · ${balance.pendingDays} pending`}
            key={balance.leaveTypeId}
            label={balance.leaveTypeName}
            value={`${balance.remainingDays} days`}
          />
        ))}
        {!balances.length ? (
          <StatCard hint="Ask HR to configure leave types" label="Leave balance" value="—" />
        ) : null}
      </div>

      <LeaveApplyForm defaultStartDate={today} leaveTypes={leaveTypes} />

      <ListCard
        columns={[
          { key: "type", label: "Type" },
          { key: "dates", label: "Dates", className: "hidden md:block flex-1" },
          { key: "days", label: "Days", className: "w-20" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="Submit your first leave request using the form above."
            title="No leave requests yet"
          />
        }
        header={
          <p className="text-sm font-medium text-[var(--foreground-primary)]">
            My requests ({requests.length})
          </p>
        }
        rows={requests.map((request) => ({
          id: request.id,
          cells: {
            type: (
              <div>
                <Link
                  className="font-medium text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                  href={`/employee/leave/${request.id}`}
                >
                  {request.leaveTypeName}
                </Link>
                {request.reason ? (
                  <p className="text-sm text-[var(--foreground-muted)]">{request.reason}</p>
                ) : null}
              </div>
            ),
            dates: `${formatDate(request.startDate)} – ${formatDate(request.endDate)}`,
            days: request.days,
            status: <RequestStatusPill status={request.status} />,
          },
          action: (
            <Link
              className="text-sm font-medium text-[var(--accent-primary)]"
              href={`/employee/leave/${request.id}`}
            >
              View
            </Link>
          ),
        }))}
      />

      {annualBalance ? (
        <p className="text-sm text-[var(--foreground-muted)]">
          Annual leave remaining: {annualBalance.remainingDays} days after pending requests.
        </p>
      ) : null}
    </div>
  );
}
