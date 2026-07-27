export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "pending";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]",
    pending: "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  }[tone];

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 text-xs font-semibold ${toneClass} ${className ?? "h-6"}`}
    >
      {label}
    </span>
  );
}
