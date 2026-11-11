"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { ModuleKey } from "@hrms/platform";

import { MenuIcon, PortalIcon, type PortalIconName } from "@/components/portal/portal-icons";
import { getHrMobileMoreItems, moduleForNavHref } from "@/lib/portal-nav";

const tabs: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/hr/dashboard", label: "Home", icon: "dashboard" },
  { href: "/hr/employees", label: "People", icon: "employees" },
  { href: "/hr/leave", label: "Leave", icon: "leave" },
  { href: "/hr/payroll", label: "Pay", icon: "payroll" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/hr/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HrMobileNav({ enabledModules }: { enabledModules?: ModuleKey[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const enabled = new Set(enabledModules ?? []);
  const hasModule = (module: ModuleKey) => enabled.has(module);

  const visibleTabs = enabledModules
    ? tabs.filter((item) => {
        const navModule = moduleForNavHref(item.href);
        return navModule ? enabled.has(navModule) : true;
      })
    : tabs;
  const moreItems = getHrMobileMoreItems(enabledModules ? { hasModule } : undefined);
  const moreActive = menuOpen || !visibleTabs.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-2 pt-2 pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {visibleTabs.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium ${
                    active ? "text-[var(--accent-primary)]" : "text-[var(--foreground-muted)]"
                  }`}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <PortalIcon className="h-5 w-5" name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              aria-expanded={menuOpen}
              className={`flex w-full flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium ${
                moreActive ? "text-[var(--accent-primary)]" : "text-[var(--foreground-muted)]"
              }`}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <MenuIcon className="h-5 w-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
      {menuOpen ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-45 bg-black/30 lg:hidden"
            onClick={() => setMenuOpen(false)}
            type="button"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-[var(--radius-xl)] border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-4 pt-4 pb-[calc(76px+16px+env(safe-area-inset-bottom))] lg:hidden">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border-primary)] pb-3">
              <span className="text-sm font-semibold text-[var(--foreground-primary)]">Menu</span>
              <button
                className="text-xs font-semibold text-[var(--accent-primary)]"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {moreItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className="flex flex-col items-center gap-1.5 px-1 py-2 text-center"
                    href={item.href}
                    key={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        active
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
                      }`}
                    >
                      <PortalIcon className="h-5 w-5" name={item.icon} />
                    </span>
                    <span className="text-[11px] leading-tight font-medium text-[var(--foreground-primary)]">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
