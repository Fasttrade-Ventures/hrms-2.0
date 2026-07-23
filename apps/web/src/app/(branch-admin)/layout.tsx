import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function BranchAdminLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="Branch Admin">{children}</PortalShell>;
}
