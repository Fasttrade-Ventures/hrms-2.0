import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function HrLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="HR Administrator">{children}</PortalShell>;
}
