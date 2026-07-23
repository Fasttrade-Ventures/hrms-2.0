import { EmptyState } from "@hrms/ui";

import type { HrComplianceRow } from "@/lib/hr/dashboard";

export function HrComplianceWatch({ rows }: { rows: HrComplianceRow[] }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-[18px] shadow-[var(--shadow-card)]">
      <h2 className="mb-3 text-[15px] font-semibold text-[var(--foreground-primary)]">Compliance watch</h2>
      {rows.length === 0 ? (
        <EmptyState description="No document expiries in the next 30 days." title="All clear" />
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div
              className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-muted)] px-3 py-2.5"
              key={row.id}
            >
              <div className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-card)] px-1 py-1.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                {row.dateLabel}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--foreground-primary)]">
                  {row.title}
                </p>
                <p className="truncate text-[11px] text-[var(--foreground-muted)]">{row.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
