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

const MAX_ROWS = 5;

export function HrActionQueue({ rows }: { rows: HrActionQueueRow[] }) {
  const visible = rows.slice(0, MAX_ROWS);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2 min-w-0 shrink-0">
        <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">HR action queue</h2>
        <p className="truncate text-[11px] text-[var(--foreground-muted)]">
          Org-wide items needing HR attention
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState description="Pending requests will appear here." title="Queue is clear" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid shrink-0 grid-cols-[64px_minmax(0,140px)_minmax(0,1fr)_64px_72px] gap-2 border-b border-[var(--border-primary)] py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] max-lg:hidden">
            <span>Type</span>
            <span>Employee</span>
            <span>Details</span>
            <span className="text-right">Time</span>
            <span className="text-right">Action</span>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-[var(--border-primary)]">
            {visible.map((row) => (
              <div
                className="grid gap-2 py-2 max-lg:grid-cols-1 lg:grid-cols-[64px_minmax(0,140px)_minmax(0,1fr)_64px_72px] lg:items-center"
                key={row.id}
              >
                <span
                  className={`inline-flex w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${toneClass[row.typeTone]}`}
                >
                  {row.type}
                </span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <PortalAvatar name={row.employeeName} />
                  <span className="truncate text-xs font-semibold text-[var(--foreground-primary)]">
                    {row.employeeName}
                  </span>
                </div>
                <p className="min-w-0 truncate text-xs text-[var(--foreground-secondary)]">{row.details}</p>
                <p className="text-[11px] text-[var(--foreground-muted)] lg:text-right">{row.timeLabel}</p>
                <div className="lg:flex lg:justify-end">
                  <Link
                    className="inline-flex h-8 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-2.5 text-[11px] font-medium hover:bg-[var(--surface-muted)] lg:w-auto"
                    href={row.href}
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
