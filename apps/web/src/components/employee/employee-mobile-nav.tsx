"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icons";

const items: Array<{ href: string; label: string; icon: PortalIconName }> = [
  { href: "/employee/dashboard", label: "Home", icon: "dashboard" },
  { href: "/employee/leave", label: "Leave", icon: "leave" },
  { href: "/employee/attendance", label: "Attend", icon: "attendance" },
  { href: "/employee/payslips", label: "Pay", icon: "payslips" },
  { href: "/employee/profile", label: "Profile", icon: "profile" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/employee/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EmployeeMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-primary)] bg-[var(--surface-card)] px-2 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                className={`flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium ${
                  active
                    ? "text-[var(--accent-primary)]"
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
