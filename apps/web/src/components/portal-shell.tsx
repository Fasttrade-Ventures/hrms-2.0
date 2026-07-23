import Link from "next/link";
import type { ReactNode } from "react";

import { getPortalNav } from "@/lib/portal-nav";

export function PortalShell({
  portal,
  children,
}: {
  portal: string;
  children: ReactNode;
}) {
  const nav = getPortalNav(portal);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <Link className="text-sm font-semibold text-blue-600" href="/">
            HRMS
          </Link>
          <p className="mt-1 text-xs text-slate-500">{portal}</p>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
