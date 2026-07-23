import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="Platform Admin">{children}</PortalLayout>;
}
