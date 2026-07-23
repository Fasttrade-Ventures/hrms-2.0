import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function DirectorLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="Director">{children}</PortalShell>;
}
