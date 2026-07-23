import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";
import { requireAuth } from "@/lib/auth/session";
import { getHrTopbarMeta } from "@/lib/hr/topbar";

export async function PortalLayout({
  portal,
  children,
}: {
  portal: string;
  children: ReactNode;
}) {
  const session = await requireAuth();
  const pageSubtitle =
    portal === "HR Administrator" ? await getHrTopbarMeta().catch(() => undefined) : undefined;

  return (
    <PortalShell pageSubtitle={pageSubtitle} portal={portal} user={session.user}>
      {children}
    </PortalShell>
  );
}
