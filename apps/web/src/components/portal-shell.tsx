"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { CloseIcon, MenuIcon } from "@/components/portal/portal-icons";
import { PortalBrand, PortalNavItem, PortalUserMenu } from "@/components/portal/portal-primitives";
import { getPortalLabel, getPortalNav } from "@/lib/portal-nav";

function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  if (href.endsWith("/dashboard")) {
    return pathname === href;
  }

  return pathname.startsWith(`${href}/`) || pathname === href;
}

export function PortalShell({
  portal,
  user,
  children,
}: {
  portal: string;
  user?: {
    fullName?: string;
    email?: string;
  };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const nav = getPortalNav(portal);
  const portalLabel = getPortalLabel(portal);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="portal-theme flex min-h-screen bg-[var(--surface-primary)]">
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-6 transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <PortalBrand />
          <button
            aria-label="Close navigation"
            className="p-2 text-[var(--foreground-secondary)] lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="mb-3 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
          {portalLabel}
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <PortalNavItem
              active={isActivePath(pathname, item.href)}
              href={item.href}
              icon={item.icon}
              key={item.href}
              label={item.label}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div className="mt-6 space-y-3 border-t border-[var(--border-primary)] pt-4">
          <PortalUserMenu email={user?.email} name={user?.fullName} />
          <form action="/api/auth/logout" method="post">
            <button
              className="w-full px-3 py-2 text-left text-sm text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground-primary)]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              className="p-2 text-[var(--foreground-secondary)] lg:hidden"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <MenuIcon />
            </button>
            <p className="text-sm font-medium text-[var(--foreground-secondary)]">{portalLabel}</p>
          </div>
          <PortalUserMenu email={user?.email} name={user?.fullName} />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
