"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { EmployeeMobileNav } from "@/components/employee/employee-mobile-nav";
import { ManagerMobileNav } from "@/components/manager/manager-mobile-nav";
import { PortalAccountMenu } from "@/components/portal/portal-account-menu";
import { CloseIcon, MenuIcon } from "@/components/portal/portal-icons";
import { PortalNavGroup } from "@/components/portal/portal-nav-group";
import {
  PortalBellButton,
  PortalBrand,
  PortalSidebarUserBlock,
} from "@/components/portal/portal-primitives";
import {
  getPortalLabel,
  getPortalNavSections,
  getPortalProfileHref,
  getPortalSettingsHref,
  resolvePortalNavLabel,
  type PortalNavSection,
} from "@/lib/portal-nav";
import type { ModuleKey } from "@hrms/platform";

function notificationsHref(portal: string): string {
  if (portal === "Manager") return "/manager/notifications";
  if (portal === "HR Administrator") return "/hr/notifications";
  return "/employee/notifications";
}

function roleHint(portal: string): string | undefined {
  if (portal === "Manager") return "Manager";
  if (portal === "HR Administrator") return "HR Admin";
  if (portal === "Employee") return "Employee";
  return undefined;
}

export function PortalShell({
  portal,
  user,
  pageSubtitle,
  unreadNotificationCount = 0,
  navSections,
  enabledModules,
  integrationsHref,
  children,
}: {
  portal: string;
  user?: {
    fullName?: string;
    email?: string;
  };
  pageSubtitle?: string;
  unreadNotificationCount?: number;
  navSections?: PortalNavSection[];
  enabledModules?: ModuleKey[];
  integrationsHref?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const sections = navSections ?? getPortalNavSections(portal);
  const portalLabel = getPortalLabel(portal);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPage = resolvePortalNavLabel(portal, pathname, sections) ?? portalLabel;
  const showMobileNav = portal === "Employee" || portal === "Manager";
  const sidebarUserMuted = portal === "Manager" || portal === "HR Administrator";
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="portal-theme flex h-dvh overflow-hidden bg-[var(--surface-primary)]">
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[248px] shrink-0 flex-col border-r border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-6 transition-transform lg:static lg:h-full lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex shrink-0 items-center justify-between px-2">
          <PortalBrand />
          <button
            aria-label="Close navigation"
            className="rounded-[var(--radius-md)] p-2 text-[var(--foreground-secondary)] lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {sections.map((section) => (
            <div className="space-y-0.5" key={section.label ?? section.items[0]?.href}>
              {section.label ? (
                <p className="px-3 pb-0.5 pt-3 text-[11px] font-medium text-[var(--foreground-muted)] first:pt-1">
                  {section.label}
                </p>
              ) : null}
              {section.items.map((item) => (
                <PortalNavGroup
                  item={item}
                  key={item.href}
                  onNavigate={() => setMobileOpen(false)}
                  pathname={pathname}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[var(--border-primary)] pt-3">
          <PortalSidebarUserBlock
            email={user?.email}
            muted={sidebarUserMuted}
            name={user?.fullName}
            roleHint={roleHint(portal)}
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--surface-card)] px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {showMobileNav ? (
              <>
                <div className="lg:hidden">
                  <PortalBrand />
                </div>
                <div className="hidden lg:block">
                  <h1 className="text-lg font-semibold text-[var(--foreground-primary)]">{currentPage}</h1>
                  {pageSubtitle ? (
                    <p className="text-xs text-[var(--foreground-muted)]">{pageSubtitle}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <button
                  aria-label="Open navigation"
                  className="rounded-[var(--radius-md)] p-2 text-[var(--foreground-secondary)] lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  type="button"
                >
                  <MenuIcon />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-[var(--foreground-primary)]">{currentPage}</h1>
                  {pageSubtitle ? (
                    <p className="text-xs text-[var(--foreground-muted)]">{pageSubtitle}</p>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="hidden text-[13px] text-[var(--foreground-muted)] md:block">{todayLabel}</p>
            <PortalBellButton href={notificationsHref(portal)} unreadCount={unreadNotificationCount} />
            <PortalAccountMenu
              email={user?.email}
              integrationsHref={integrationsHref}
              name={user?.fullName}
              profileHref={getPortalProfileHref(portal)}
              settingsHref={getPortalSettingsHref(portal)}
            />
          </div>
        </header>

        <main
          className={`min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto ${showMobileNav ? "pb-24 lg:pb-6" : ""}`}
          style={{ padding: portal === "HR Administrator" ? 24 : undefined }}
        >
          <div className={portal === "HR Administrator" ? "min-w-0 w-full" : "min-w-0 w-full px-4 py-6 sm:px-6 sm:py-6 lg:px-8"}>
            {children}
          </div>
        </main>
        {portal === "Employee" ? <EmployeeMobileNav enabledModules={enabledModules} /> : null}
        {portal === "Manager" ? <ManagerMobileNav /> : null}
      </div>
    </div>
  );
}
