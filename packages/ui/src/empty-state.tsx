import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon,
  variant = "card",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: "card" | "flat";
}) {
  const containerClasses =
    variant === "card"
      ? "flex min-h-36 flex-col items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-6 py-10 text-center shadow-[var(--shadow-card)]"
      : "flex min-h-32 flex-col items-center justify-center px-4 py-8 text-center";

  return (
    <div className={containerClasses}>
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-accent-soft)] text-[var(--accent-primary)] [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--foreground-primary)]">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
