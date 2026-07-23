export function HrWorkforcePulse({
  presentPct,
  onLeavePct,
  absentPct,
}: {
  presentPct: number;
  onLeavePct: number;
  absentPct: number;
}) {
  const bars = [
    { label: "Present", pct: presentPct, color: "bg-[var(--success)]" },
    { label: "On leave", pct: onLeavePct, color: "bg-[var(--accent-primary)]" },
    { label: "Absent / late", pct: absentPct, color: "bg-[#d97706]" },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-[18px] shadow-[var(--shadow-card)]">
      <h2 className="mb-3 text-[15px] font-semibold text-[var(--foreground-primary)]">Workforce today</h2>
      <div className="space-y-4">
        {bars.map((bar) => (
          <div className="space-y-1.5" key={bar.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--foreground-secondary)]">{bar.label}</span>
              <span className="font-semibold text-[var(--foreground-primary)]">{bar.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-muted)]">
              <div
                className={`h-2 rounded-full ${bar.color}`}
                style={{ width: `${Math.max(bar.pct, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
