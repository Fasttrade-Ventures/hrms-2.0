import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-5 text-center">
      {icon ? <div className="mb-2 text-[var(--foreground-muted)]">{icon}</div> : null}
      <h3 className="text-[13px] font-semibold text-[var(--foreground-primary)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
