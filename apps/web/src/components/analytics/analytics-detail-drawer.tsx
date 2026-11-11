"use client";

import { Button } from "@/components/ui/button";
import type { AnalyticsDetail } from "@/lib/analytics/queries";

export function AnalyticsDetailDrawer({
  open,
  onClose,
  detail,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  detail: AnalyticsDetail | null;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close detail"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--border-primary)] bg-[var(--surface-card)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold text-[var(--foreground-primary)]">{detail?.title ?? "Detail"}</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${detail?.total ?? 0} row${detail?.total === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading rows…</p>
          ) : !detail || detail.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows for this selection.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {detail.columns.map((column) => (
                      <th className="px-3 py-2 font-medium" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row, index) => (
                    <tr className="border-t" key={index}>
                      {detail.columns.map((column) => (
                        <td className="px-3 py-2 align-top" key={column}>
                          {row[column] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
