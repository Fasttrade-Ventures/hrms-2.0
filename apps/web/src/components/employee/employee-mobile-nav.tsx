"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { ModuleKey } from "@hrms/platform";

import { PortalIcon, type PortalIconName, MenuIcon } from "@/components/portal/portal-icons";
import { moduleForNavHref } from "@/lib/portal-nav";

const items: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/employee/dashboard", label: "Home", icon: "dashboard" },
  { href: "/employee/leave", label: "Leave", icon: "leave" },
  { href: "/employee/attendance", label: "Attend", icon: "attendance" },
  { href: "/employee/payslips", label: "Pay", icon: "payslips" },
];

const moreItems: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/employee/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/employee/announcements", label: "Announcements", icon: "announcements" },
  { href: "/employee/calendar", label: "Calendar", icon: "calendar" },
  { href: "/employee/claims", label: "Claims", icon: "claims" },
  { href: "/employee/overtime", label: "Overtime", icon: "overtime" },
  { href: "/employee/documents", label: "Documents", icon: "documents" },
  { href: "/employee/replacement-credit", label: "Replacement", icon: "replacement-credit" },
  { href: "/employee/profile", label: "Profile", icon: "profile" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/employee/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmployeeMobileNav({ enabledModules }: { enabledModules?: ModuleKey[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const enabled = new Set(enabledModules ?? []);

  const visibleItems = enabledModules
    ? items.filter((item) => {
        const navModule = moduleForNavHref(item.href);
        return navModule ? enabled.has(navModule) : true;
      })
    : items;

  const visibleMoreItems = enabledModules
    ? moreItems.filter((item) => {
        const navModule = moduleForNavHref(item.href);
        return navModule ? enabled.has(navModule) : true;
      })
    : moreItems;

  const isMoreActive = menuOpen || !items.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-2 pb-[calc(6px+env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {visibleItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  className={`flex flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium ${
                    active
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--foreground-muted)]"
                  }`}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <PortalIcon name={item.icon} className="h-5 w-5" />
                  <span>{item.label}</span>
                  {active && <div className="h-[4px] w-[4px] rounded-full bg-[var(--accent-primary)]" />}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex w-full flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium transition-colors ${
                isMoreActive
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--foreground-muted)]"
              }`}
            >
              <MenuIcon className="h-5 w-5" />
              <span>More</span>
              {isMoreActive && <div className="h-[4px] w-[4px] rounded-full bg-[var(--accent-primary)]" />}
            </button>
          </li>
        </ul>
      </nav>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-45 bg-black/30 backdrop-blur-xs transition-opacity lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[var(--radius-xl)] border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-4 pb-[calc(76px+16px+env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-elevated)] transition-all lg:hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-primary)]/50">
              <span className="text-sm font-semibold text-[var(--foreground-primary)]">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {visibleMoreItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-center gap-1.5 px-1 py-2 text-center"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)] hover:bg-[var(--surface-muted)]"
                      }`}
                    >
                      <PortalIcon name={item.icon} className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-[11px] font-medium leading-tight ${
                        active
                          ? "font-semibold text-[var(--accent-primary)]"
                          : "text-[var(--foreground-primary)]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
