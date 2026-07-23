export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]",
    success: "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]",
    warning: "bg-[#fef3c7] text-[#92400e]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  }[tone];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {label}
    </span>
  );
}
