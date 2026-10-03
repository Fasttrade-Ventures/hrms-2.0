import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { listLeaveBalanceAuditLogs } from "@/lib/leave/audit";

function formatActionType(action: string): { label: string; tone: string } {
  switch (action) {
    case "monthly_accrual":
      return { label: "Monthly Accrual", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" };
    case "year_end_carry_forward":
      return { label: "Carry-Forward", tone: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400" };
    case "carry_forward_forfeited":
      return { label: "Cap Forfeited", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400" };
    case "carry_forward_expiry":
      return { label: "Carry Expired", tone: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400" };
    case "manual_adjustment":
      return { label: "Manual Adjustment", tone: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400" };
    default:
      return { label: action.replace(/_/g, " "), tone: "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-400" };
  }
}

export default async function LeaveBalanceAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("hr_administrator");
  const params = await searchParams;
  const actionType = typeof params.actionType === "string" ? params.actionType : undefined;
  const page = typeof params.page === "string" ? Math.max(1, Number(params.page)) : 1;

  const { rows, total, pageSize } = await listLeaveBalanceAuditLogs({
    actionType,
    page,
    pageSize: 20,
  });

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/leave" variant="outline">
              Back to leave
            </HrLinkButton>
          </div>
        }
        description="Immutable audit trail of automated monthly accruals, year-end rollovers, and balance changes."
        title="Leave balance audit log"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <label htmlFor="actionType" className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            Filter by action:
          </label>
          <select
            id="actionType"
            name="actionType"
            defaultValue={actionType ?? "all"}
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-primary)] px-3 py-1.5 text-sm text-[var(--foreground-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          >
            <option value="all">All actions</option>
            <option value="monthly_accrual">Monthly accrual</option>
            <option value="year_end_carry_forward">Year-end carry-forward</option>
            <option value="carry_forward_forfeited">Carry-forward forfeited</option>
            <option value="carry_forward_expiry">Carry-forward expired</option>
            <option value="manual_adjustment">Manual adjustment</option>
          </select>
          <button
            type="submit"
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            Apply
          </button>
        </form>

        <div className="text-xs text-[var(--foreground-muted)]">
          Total: {total} log entries
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--surface-primary)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] text-xs uppercase text-[var(--foreground-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Effective Date</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Leave Type</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold text-right">Prev</th>
                <th className="px-4 py-3 font-semibold text-right">Change</th>
                <th className="px-4 py-3 font-semibold text-right">New</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-secondary)]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
                    No balance audit logs found for the selected criteria.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const badge = formatActionType(row.actionType);
                  return (
                    <tr key={row.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--foreground-muted)]">
                        {row.effectiveDate}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground-primary)]">
                        <div>{row.employeeName}</div>
                        {row.employeeNumber ? (
                          <div className="text-xs text-[var(--foreground-muted)]">#{row.employeeNumber}</div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground-primary)]">
                        {row.leaveTypeName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-block rounded-[var(--radius-full)] border px-2 py-0.5 text-xs font-medium ${badge.tone}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-[var(--foreground-muted)]">
                        {row.previousBalance.toFixed(2)}d
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        <span className={row.deltaDays > 0 ? "text-emerald-600 dark:text-emerald-400" : row.deltaDays < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--foreground-muted)]"}>
                          {row.deltaDays > 0 ? `+${row.deltaDays.toFixed(2)}` : row.deltaDays.toFixed(2)}d
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[var(--foreground-primary)]">
                        {row.newBalance.toFixed(2)}d
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-[var(--foreground-muted)]" title={row.reason ?? ""}>
                        {row.reason ?? "Automated scheduled operation"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-primary)] px-4 py-3 text-xs text-[var(--foreground-muted)]">
            <div>Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              {page > 1 ? (
                <HrLinkButton
                  href={`/hr/leave/audit?page=${page - 1}${actionType ? `&actionType=${actionType}` : ""}`}
                  variant="outline"
                >
                  Previous
                </HrLinkButton>
              ) : null}
              {page < totalPages ? (
                <HrLinkButton
                  href={`/hr/leave/audit?page=${page + 1}${actionType ? `&actionType=${actionType}` : ""}`}
                  variant="outline"
                >
                  Next
                </HrLinkButton>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
