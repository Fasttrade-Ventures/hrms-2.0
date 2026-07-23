"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icons";

const items: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/manager/dashboard", label: "Home", icon: "dashboard" },
  { href: "/manager/approvals", label: "Approvals", icon: "approvals" },
  { href: "/manager/team-leave", label: "Team", icon: "team-leave" },
  { href: "/manager/team-calendar", label: "Calendar", icon: "team-calendar" },
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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 lg:hidden">
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
              >
                <PortalIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
