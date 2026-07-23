import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="Organization Owner">{children}</PortalShell>;
}
