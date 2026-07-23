import type { ReactNode } from "react";

import { PortalShell } from "@/components/portal-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="Auth">{children}</PortalShell>;
}
