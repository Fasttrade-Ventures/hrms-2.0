export function CalendarLegend({ showCompanyEvents = false }: { showCompanyEvents?: boolean }) {
  const items = [
    { label: "Approved leave", className: "bg-emerald-100" },
    { label: "Pending leave", className: "bg-amber-100" },
    { label: "Holiday", className: "bg-sky-100" },
  ];

  if (showCompanyEvents) {
    items.push(
      { label: "Training", className: "bg-violet-100" },
      { label: "Office closure", className: "bg-rose-100" },
      { label: "Town hall", className: "bg-indigo-100" },
    );
  }

  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((item) => (
        <span className="inline-flex items-center gap-1.5" key={item.label}>
          <span className={`inline-block size-2.5 rounded-sm ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
