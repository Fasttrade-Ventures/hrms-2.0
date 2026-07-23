import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="Platform Admin">{children}</PortalShell>;
}
