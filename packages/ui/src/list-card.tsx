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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">{header}</div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-4 py-4">
            {columns.map((col) => (
              <div key={col.key} className={col.className ?? "flex-1 text-sm text-slate-700"}>
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
