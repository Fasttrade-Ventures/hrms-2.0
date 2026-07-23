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
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm font-semibold text-blue-600">HRMS</p>
          <p className="text-xs text-slate-500">{portalLabel}</p>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        {topbar ? (
          <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6">
            {topbar}
          </header>
        ) : null}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
