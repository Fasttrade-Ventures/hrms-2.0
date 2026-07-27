import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";
import { requireAuth } from "@/lib/auth/session";
import { getHrTopbarMeta } from "@/lib/hr/topbar";
import { getUnreadNotificationCount } from "@/lib/notifications/inbox";

export async function PortalLayout({
  portal,
  children,
}: {
  portal: string;
  children: ReactNode;
}) {
  const session = await requireAuth();
  const [pageSubtitle, unreadNotificationCount] = await Promise.all([
    portal === "HR Administrator" ? getHrTopbarMeta().catch(() => undefined) : Promise.resolve(undefined),
    getUnreadNotificationCount().catch(() => 0),
  ]);

  return (
    <PortalShell
      pageSubtitle={pageSubtitle}
      portal={portal}
      unreadNotificationCount={unreadNotificationCount}
      user={session.user}
    >
      {children}
    </PortalShell>
  );
}
