export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "pending";
  className?: string;
}) {
  const normalized = (label ?? "").trim().toLowerCase();
  const effectiveTone =
    tone === "neutral" || tone === "warning"
      ? normalized === "active" || normalized === "approved" || normalized === "paid" || normalized === "confirmed"
        ? "success"
        : normalized === "inactive" || normalized === "rejected" || normalized === "declined" || normalized === "cancelled" || normalized === "revoked"
          ? "danger"
          : tone
      : tone;

  const toneClass = {
    neutral: "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]",
    pending: "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]",
    success: "border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    warning: "border border-amber-500/30 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    danger: "border border-rose-500/30 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  }[effectiveTone];

  const formattedLabel = label
    ? label
        .split(/[\s_]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : label;

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 text-xs font-semibold ${toneClass} ${className ?? "h-6"}`}
    >
      {formattedLabel}
    </span>
  );
}
