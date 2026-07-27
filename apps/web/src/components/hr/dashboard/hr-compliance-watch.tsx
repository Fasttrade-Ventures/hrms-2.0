import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import type { HrComplianceRow } from "@/lib/hr/dashboard";

export function HrComplianceWatch({ rows }: { rows: HrComplianceRow[] }) {
  const visible = rows.slice(0, 3);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Compliance watch</h2>
        <Link
          className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 text-[11px] font-medium hover:bg-[var(--surface-muted)]"
          href="/hr/documents/compliance"
        >
          View more
        </Link>
      </div>
      {visible.length === 0 ? (
        <EmptyState description="No missing or expiring required documents." title="All clear" />
      ) : (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {visible.map((row) => (
            <div
              className="flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-2.5 py-2"
              key={row.id}
            >
              <div className="flex w-12 shrink-0 items-center justify-center rounded-md bg-[var(--surface-card)] px-1 py-1 text-[10px] font-semibold text-[var(--accent-primary)]">
                {row.dateLabel}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--foreground-primary)]">
                  {row.title}
                </p>
                <p className="truncate text-[10px] text-[var(--foreground-muted)]">{row.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
