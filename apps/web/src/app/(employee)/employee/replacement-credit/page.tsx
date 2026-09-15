import Link from "next/link";
import { submitReplacementCredit } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import {
  formatDate,
  RequestStatusPill,
} from "@/components/employee/employee-shared";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireModule } from "@/lib/entitlements";
import {
  getReplacementCreditStats,
  listReplacementCredits,
} from "@/lib/employee/requests";
import { EmptyState, ListCard } from "@hrms/ui";

export default async function Page() {
  await requireModule("replacement");
  const [stats, credits] = await Promise.all([
    getReplacementCreditStats(),
    listReplacementCredits(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Claim replacement leave credit for working on a rest day or public holiday."
        title="Replacement Credit"
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">
                Available Credits
              </p>
              {stats.available > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {stats.available.toFixed(1)} <span className="text-xs font-normal text-[var(--foreground-muted)]">days</span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-primary)]/50 flex items-center justify-between text-xs">
            <span className="text-[11px] text-[var(--foreground-muted)]">Use as leave:</span>
            <Link
              href="/employee/leave"
              className="font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-0.5 text-xs"
            >
              Apply Leave →
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">
              Pending Claims
            </p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {stats.pending.toFixed(1)} <span className="text-xs font-normal text-[var(--foreground-muted)]">days</span>
            </p>
          </div>
          <p className="mt-3 pt-2.5 border-t border-[var(--border-primary)]/50 text-[11px] text-[var(--foreground-muted)]">
            Awaiting manager approval
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">
              Approved (YTD)
            </p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {stats.approvedYtd.toFixed(1)} <span className="text-xs font-normal text-[var(--foreground-muted)]">days</span>
            </p>
          </div>
          <p className="mt-3 pt-2.5 border-t border-[var(--border-primary)]/50 text-[11px] text-[var(--foreground-muted)]">
            Total days credited this year
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">
              Rejected Claims
            </p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground-primary)]">
              {stats.rejected.toFixed(1)} <span className="text-xs font-normal text-[var(--foreground-muted)]">days</span>
            </p>
          </div>
          <p className="mt-3 pt-2.5 border-t border-[var(--border-primary)]/50 text-[11px] text-[var(--foreground-muted)]">
            Unapproved claims this year
          </p>
        </div>
      </div>

      {/* Claim Form */}
      <EmployeeRequestForm
        action={submitReplacementCredit}
        description="Worked on a weekend or gazetted public holiday? Submit this claim to your manager to earn replacement leave credits."
        submitLabel="Submit Credit Claim"
        title="Claim Credit for Rest Day Work"
      >
        <div className="grid gap-5 md:grid-cols-3">
          <HrField id="workDate" label="Work date">
            <HrTextInput defaultValue={today} id="workDate" name="workDate" required type="date" />
          </HrField>
          <HrField id="creditDays" label="Credit days">
            <HrTextInput defaultValue="1.0" id="creditDays" name="creditDays" required />
          </HrField>
          <HrField id="description" label="Description / Reason">
            <HrTextInput id="description" name="description" placeholder="e.g. Server migration on Sunday" />
          </HrField>
        </div>
      </EmployeeRequestForm>

      {/* Claim History */}
      <ListCard
        columns={[
          { key: "workDate", label: "Work date", className: "w-36" },
          { key: "description", label: "Description", className: "hidden md:block flex-1" },
          { key: "creditDays", label: "Credit", className: "w-24 text-right md:text-left" },
          { key: "status", label: "Status", className: "w-28" },
          { key: "usage", label: "Usage", className: "w-28 text-right" },
        ]}
        empty={
          <EmptyState
            description="Submit your first replacement credit using the form above."
            icon={<PortalIcon name="replacement-credit" className="h-6 w-6" />}
            title="No replacement credits claimed yet"
          />
        }
        rows={credits.map((c) => ({
          id: c.id,
          cells: {
            workDate: formatDate(c.workDate),
            description: c.description ?? "—",
            creditDays: `${c.creditDays.toFixed(1)} d`,
            status: <RequestStatusPill status={c.status} />,
            usage:
              c.status === "approved" ? (
                c.isConsumed ? (
                  <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--foreground-muted)]">
                    Consumed
                  </span>
                ) : c.consumedDays > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                    {c.remainingDays.toFixed(1)}d left
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                    Available
                  </span>
                )
              ) : (
                <span className="text-xs text-[var(--foreground-muted)]">—</span>
              ),
          },
        }))}
        header={
          <p className="text-sm font-medium text-[var(--foreground-primary)]">
            Claim history ({credits.length})
          </p>
        }
      />
    </div>
  );
}
