import Link from "next/link";

import { PortalFilterChip, PortalFilterChips } from "@/components/portal/portal-filter-chips";

export function ManagerProfileTabs({
  active,
}: {
  active: "personal" | "security";
}) {
  const tabs = [
    { id: "personal" as const, label: "Personal", href: "/manager/profile" },
    { id: "security" as const, label: "Security", href: "/manager/profile/security" },
  ];

  return (
    <PortalFilterChips>
      {tabs.map((tab) => (
        <PortalFilterChip active={active === tab.id} href={tab.href} key={tab.id}>
          {tab.label}
        </PortalFilterChip>
      ))}
    </PortalFilterChips>
  );
}

/** @deprecated Prefer ManagerProfileTabs; kept for any stray imports. */
export function ManagerProfileTabLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-sm font-medium text-[var(--accent-primary)]" href={href}>
      {children}
    </Link>
  );
}
