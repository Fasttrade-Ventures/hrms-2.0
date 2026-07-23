import type { ReactNode } from "react";

/**
 * Pencil Card/Stat (XlJXc)
 * - padding 22
 * - icon chip 40×40, radius 12, top-left
 * - label → value → hint
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-start rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]"
      style={{ padding: 22, gap: 4 }}
    >
      {icon ? (
        <div
          className="flex shrink-0 items-center justify-center bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
          style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 4 }}
        >
          {icon}
        </div>
      ) : null}
      <p className="text-[13px] font-medium text-[var(--foreground-secondary)]">{label}</p>
      <p
        className="font-semibold leading-none tracking-tight text-[var(--foreground-primary)]"
        style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: 32 }}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-[var(--foreground-muted)]">{hint}</p> : null}
    </div>
  );
}
