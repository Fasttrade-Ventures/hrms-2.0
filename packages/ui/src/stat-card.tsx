import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
      <p className="text-[13px] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--foreground-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{hint}</p> : null}
    </div>
  );
}
