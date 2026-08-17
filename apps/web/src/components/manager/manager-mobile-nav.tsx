"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PortalIcon, type PortalIconName, MenuIcon } from "@/components/portal/portal-icons";

const items: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/manager/dashboard", label: "Home", icon: "dashboard" },
  { href: "/manager/approvals", label: "Approvals", icon: "approvals" },
  { href: "/manager/team-leave", label: "Team", icon: "team-leave" },
  { href: "/manager/team-calendar", label: "Calendar", icon: "team-calendar" },
];

const moreItems: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/manager/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/manager/approvals", label: "Approvals", icon: "approvals" },
  { href: "/manager/announcements", label: "Announcements", icon: "announcements" },
  { href: "/manager/team-leave", label: "Team Leave", icon: "team-leave" },
  { href: "/manager/team-attendance", label: "Team Attend", icon: "team-attendance" },
  { href: "/manager/team-documents", label: "Team Docs", icon: "documents" },
  { href: "/manager/team-calendar", label: "Team Calendar", icon: "team-calendar" },
  { href: "/manager/team-performance", label: "Team Perf.", icon: "team-performance" },
  { href: "/manager/profile", label: "Profile", icon: "profile" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/manager/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ManagerMobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isMoreActive = menuOpen || !items.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        <ul className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  className={`flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium ${
                    active
                      ? "font-semibold text-[var(--accent-primary)]"
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
              className={`flex w-full flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors ${
                isMoreActive
                  ? "font-semibold text-[var(--accent-primary)]"
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
              {moreItems.map((item) => {
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
                      className={`text-[10px] font-medium leading-tight ${
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
