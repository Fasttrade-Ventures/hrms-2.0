export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[var(--border-primary)] bg-[var(--surface-card)] p-10 text-center">
      <h3 className="text-base font-medium text-[var(--foreground-primary)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
