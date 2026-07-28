import type { ReactNode } from "react";

import { ImpersonationBanner } from "@/components/platform/impersonation-controls";
import { PortalShell } from "@/components/portal-shell";
import { requireAuth } from "@/lib/auth/session";
import { getHrTopbarMeta } from "@/lib/hr/topbar";
import { getImpersonationState } from "@/lib/platform/impersonation";
import { getUnreadNotificationCount } from "@/lib/notifications/inbox";

export async function PortalLayout({
  portal,
  children,
}: {
  portal: string;
  children: ReactNode;
}) {
  const session = await requireAuth();
  const [pageSubtitle, unreadNotificationCount, impersonation] = await Promise.all([
    portal === "HR Administrator" ? getHrTopbarMeta().catch(() => undefined) : Promise.resolve(undefined),
    getUnreadNotificationCount().catch(() => 0),
    getImpersonationState(session).catch(() => null),
  ]);

  return (
    <>
      {impersonation ? <ImpersonationBanner organizationName={impersonation.organizationName} /> : null}
      <PortalShell
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
