import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import { PortalAvatar } from "@/components/portal/portal-primitives";
import type { HrActionQueueRow } from "@/lib/hr/dashboard";

const toneClass = {
  leave: "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]",
  claim: "bg-[var(--success-soft)] text-[var(--success)]",
  ot: "bg-[#fef3c7] text-[#d97706]",
  late: "bg-[var(--danger-soft)] text-[var(--danger)]",
  neutral: "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]",
};

export function HrActionQueue({ rows }: { rows: HrActionQueueRow[] }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-[18px] shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground-primary)]">HR action queue</h2>
          <p className="text-xs text-[var(--foreground-muted)]">Org-wide items needing HR attention</p>
        </div>
        <Link
          className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-xs font-medium hover:bg-[var(--surface-muted)]"
          href="/hr/apply-behalf"
        >
          View all
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState description="Pending requests will appear here." title="Queue is clear" />
      ) : (
        <>
          <div className="grid grid-cols-[72px_160px_1fr_72px_72px] gap-2.5 border-b border-[var(--border-primary)] px-0 py-2.5 text-[11px] font-semibold text-[var(--foreground-muted)] max-lg:hidden">
            <span>Type</span>
            <span>Employee</span>
            <span>Details</span>
            <span>Time</span>
            <span />
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {rows.map((row) => (
              <div
                className="grid gap-3 py-2.5 max-lg:grid-cols-1 lg:grid-cols-[72px_160px_1fr_72px_72px] lg:items-center lg:gap-2.5"
                key={row.id}
              >
                <span
                  className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass[row.typeTone]}`}
                >
                  {row.type}
                </span>
                <div className="flex items-center gap-2">
                  <PortalAvatar name={row.employeeName} />
                  <span className="text-[13px] font-semibold text-[var(--foreground-primary)]">
                    {row.employeeName}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--foreground-secondary)]">{row.details}</p>
                <p className="text-xs text-[var(--foreground-muted)] lg:text-right">{row.timeLabel}</p>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-xs font-medium hover:bg-[var(--surface-muted)]"
                  href={row.href}
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
