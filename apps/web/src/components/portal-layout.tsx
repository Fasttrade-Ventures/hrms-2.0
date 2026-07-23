import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";
import { requireAuth } from "@/lib/auth/session";

export async function PortalLayout({
  portal,
  children,
}: {
  portal: string;
  children: ReactNode;
}) {
  const session = await requireAuth();

  return (
    <PortalShell portal={portal} user={session.user}>
      {children}
    </PortalShell>
  );
}
