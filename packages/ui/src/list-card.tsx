import type { ReactNode } from "react";

function columnClassName(col: { className?: string }, variant: "header" | "cell") {
  const base = col.className ?? "min-w-0 flex-1";
  const width = col.className?.match(/\bw-\S+/)?.[0];
  const sized = width ? `${width} shrink-0` : base;

  if (variant === "header") {
    return `${sized} text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]`;
  }

  return `${sized} text-sm text-[var(--foreground-secondary)]`;
}

/** Documents-style list card (Pencil list tables). */
export function ListCard({
  header,
  columns,
  rows,
  empty,
  compact = false,
}: {
  header: ReactNode;
  columns: Array<{ key: string; label: string; className?: string }>;
  rows: Array<{ id: string; cells: Record<string, ReactNode>; action?: ReactNode }>;
  empty?: ReactNode;
  compact?: boolean;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">
        {header}
      </div>
      <div className="overflow-x-auto">
        {rows.length > 0 ? (
          <div className="min-w-max">
            <div className="flex items-center gap-4 border-b border-[var(--border-primary)] bg-[var(--surface-muted)]/60 px-4 py-2.5">
              {columns.map((col) => (
                <div key={col.key} className={columnClassName(col, "header")}>
                  {col.label}
                </div>
              ))}
              {rows.some((row) => row.action) ? (
                <div className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
                  Action
                </div>
              ) : null}
            </div>
            <div className="divide-y divide-[var(--border-primary)]">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={compact ? "flex items-center gap-4 px-4 py-2.5" : "flex items-center gap-4 px-4 py-4"}
                >
                  {columns.map((col) => (
                    <div key={col.key} className={columnClassName(col, "cell")}>
                      {row.cells[col.key]}
                    </div>
                  ))}
                  {row.action ? <div className="w-16 shrink-0">{row.action}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--foreground-muted)]">No rows to display.</p>
        )}
      </div>
    </div>
  );
}
