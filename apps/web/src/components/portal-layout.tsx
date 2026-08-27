import type { ReactNode } from "react";

import type { ModuleKey } from "@hrms/platform";

import { ImpersonationBanner } from "@/components/platform/impersonation-controls";
import { PortalShell } from "@/components/portal-shell";
import { listUserMemberships, requireRole, requireRoleOrPermission } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { getHrTopbarMeta } from "@/lib/hr/topbar";
import { getPortalNavSectionsForEntitlements, getPortalIntegrationsHref } from "@/lib/portal-nav";
import { getImpersonationState } from "@/lib/platform/impersonation";
import { getUnreadNotificationCount } from "@/lib/notifications/inbox";
import { createClient } from "@/lib/supabase/server";
import type { OrgSwitcherOption } from "@/components/portal/organization-switcher";

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
  requiredRoles,
  requiredPermissions,
  children,
}: {
  portal: string;
  /** Membership roles allowed into this portal shell (mirrors middleware). */
  requiredRoles?: string[];
  /** Optional permissions that also grant access (e.g. auditor). */
  requiredPermissions?: string[];
  children: ReactNode;
}) {
  const session =
    requiredPermissions?.length && requiredRoles?.length
      ? await requireRoleOrPermission(requiredRoles, requiredPermissions)
      : requiredPermissions?.length
        ? await requireRoleOrPermission([], requiredPermissions)
        : await requireRole(...(requiredRoles ?? []));

  const [pageSubtitle, unreadNotificationCount, impersonation, entitlements, orgSwitcher] =
    await Promise.all([
      portal === "HR Administrator" ? getHrTopbarMeta().catch(() => undefined) : Promise.resolve(undefined),
      getUnreadNotificationCount().catch(() => 0),
      getImpersonationState(session).catch(() => null),
      getEntitlements(),
      loadOrgSwitcherOptions(session.user.id, session.membership.organizationId),
    ]);

  const navSections = getPortalNavSectionsForEntitlements(portal, {
    hasModule: (module) => entitlements.hasModule(module),
    tier: entitlements.tier,
  });
  const enabledModules = ALL_MODULE_KEYS.filter((module) => entitlements.hasModule(module));
  const integrationsHref =
    portal === "HR Administrator" ? getPortalIntegrationsHref(portal) : undefined;

  return (
    <>
      {impersonation ? <ImpersonationBanner organizationName={impersonation.organizationName} /> : null}
      <PortalShell
        enabledModules={enabledModules}
        integrationsHref={integrationsHref}
        navSections={navSections}
        orgSwitcher={orgSwitcher}
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

async function loadOrgSwitcherOptions(
  userId: string,
  activeOrganizationId: string,
): Promise<{ options: OrgSwitcherOption[]; activeOrganizationId: string } | null> {
  if ((process.env.DEPLOYMENT_MODE ?? "standalone") !== "saas") {
    return null;
  }

  const memberships = await listUserMemberships(userId);
  if (memberships.length < 2) return null;

  const supabase = await createClient();
  const orgIds = memberships.map((row) => row.organizationId);
  const { data } = await supabase.from("organizations").select("id, name").in("id", orgIds);
  const nameById = new Map((data ?? []).map((row) => [row.id, row.name as string]));

  return {
    activeOrganizationId,
    options: memberships.map((row) => ({
      organizationId: row.organizationId,
      name: nameById.get(row.organizationId) ?? row.organizationId.slice(0, 8),
    })),
  };
}
