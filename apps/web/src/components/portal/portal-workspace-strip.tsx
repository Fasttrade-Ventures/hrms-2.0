import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Sticky workspace chrome (recruitment-desk pattern): title + meta + actions above a primary surface.
 * Page should skip PortalPageHeader when this strip owns the H1.
 */
export function PortalWorkspaceStrip({
  title,
  meta,
  badge,
  actions,
  className,
}: {
  title: string;
  meta?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-1 mb-4 border-b border-[var(--border-primary)] bg-[var(--surface-primary)]/95 px-1 py-3 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-[var(--foreground-primary)]">{title}</h1>
            {badge}
          </div>
          {meta ? (
            <div className="text-sm text-[var(--foreground-secondary)]">{meta}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
