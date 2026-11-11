import type { ReactNode } from "react";

function columnClassName(col: { className?: string }, variant: "header" | "cell") {
  const base = col.className ?? "min-w-0 flex-1";
  const hasWidth = col.className?.split(/\s+/).some((c) => c.startsWith("w-"));
  const sized = hasWidth ? `${base} shrink-0` : base;

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
          <table className="min-w-full w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)]/60">
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-2.5 ${columnClassName(col, "header")}`} scope="col">
                    {col.label}
                  </th>
                ))}
                {rows.some((row) => row.action) ? (
                  <th
                    className="w-16 shrink-0 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]"
                    scope="col"
                  >
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-[var(--border-primary)] last:border-b-0" key={row.id}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 align-middle ${compact ? "py-2.5" : "py-4"} ${columnClassName(col, "cell")}`}
                    >
                      {row.cells[col.key]}
                    </td>
                  ))}
                  {row.action ? <td className="w-16 shrink-0 px-4 align-middle">{row.action}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--foreground-muted)]">No rows to display.</p>
        )}
      </div>
    </div>
  );
}
