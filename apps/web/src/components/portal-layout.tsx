import type { ReactNode } from "react";

import type { ModuleKey } from "@hrms/platform";

import { ImpersonationBanner } from "@/components/platform/impersonation-controls";
import { PortalShell } from "@/components/portal-shell";
import { requireAuth } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { getHrTopbarMeta } from "@/lib/hr/topbar";
import { getPortalNavSectionsForEntitlements } from "@/lib/portal-nav";
import { getImpersonationState } from "@/lib/platform/impersonation";
import { getUnreadNotificationCount } from "@/lib/notifications/inbox";

const ALL_MODULE_KEYS: ModuleKey[] = [
  "announcements",
  "calendar",
  "documents",
  "assets",
  "performance",
  "payroll",
  "ot",
  "claims",
  "replacement",
  "location",
  "import",
  "payouts",
  "audit",
  "api",
  "analytics",
  "recruitment",
  "integrations",
];

export async function PortalLayout({
  portal,
  children,
}: {
  portal: string;
  children: ReactNode;
}) {
  const session = await requireAuth();
  const [pageSubtitle, unreadNotificationCount, impersonation, entitlements] = await Promise.all([
    portal === "HR Administrator" ? getHrTopbarMeta().catch(() => undefined) : Promise.resolve(undefined),
    getUnreadNotificationCount().catch(() => 0),
    getImpersonationState(session).catch(() => null),
    getEntitlements(),
  ]);

  const navSections = getPortalNavSectionsForEntitlements(portal, {
    hasModule: (module) => entitlements.hasModule(module),
    tier: entitlements.tier,
  });
  const enabledModules = ALL_MODULE_KEYS.filter((module) => entitlements.hasModule(module));

  return (
    <>
      {impersonation ? <ImpersonationBanner organizationName={impersonation.organizationName} /> : null}
      <PortalShell
        enabledModules={enabledModules}
        navSections={navSections}
        pageSubtitle={pageSubtitle}
        portal={portal}
        unreadNotificationCount={unreadNotificationCount}
        user={session.user}
      >
        {children}
      </PortalShell>
    </>
  );
}
