import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="Manager">{children}</PortalShell>;
}
