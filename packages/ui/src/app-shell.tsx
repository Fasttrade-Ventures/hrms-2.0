import type { ReactNode } from "react";

export function AppShell({
  portalLabel,
  nav,
  topbar,
  children,
}: {
  portalLabel: string;
  nav: Array<{ href: string; label: string }>;
  topbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--surface-primary)]">
      <aside className="w-[248px] border-r border-[var(--border-primary)] bg-[var(--surface-card)]">
        <div className="border-b border-[var(--border-primary)] p-4">
          <p className="text-sm font-semibold text-[var(--accent-primary)]">HRMS</p>
          <p className="text-xs text-[var(--foreground-muted)]">{portalLabel}</p>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        {topbar ? (
          <header className="flex h-16 items-center justify-end border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-6">
            {topbar}
          </header>
        ) : null}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
