import type { ReactNode } from "react";

/** Documents-style list card (padding 16, soft shadow, rounded muted header). */
export function ListCard({
  header,
  columns,
  rows,
  empty,
}: {
  header: ReactNode;
  columns: Array<{ key: string; label: string; className?: string }>;
  rows: Array<{ id: string; cells: Record<string, ReactNode>; action?: ReactNode }>;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-hidden border border-[var(--border-primary)] bg-[var(--surface-card)]">
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">{header}</div>
      <div className="divide-y divide-[var(--border-primary)]">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-4 py-4">
            {columns.map((col) => (
              <div
                key={col.key}
                className={col.className ?? "flex-1 text-sm text-[var(--foreground-secondary)]"}
              >
                {row.cells[col.key]}
              </div>
            ))}
            {row.action ? <div className="shrink-0">{row.action}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
