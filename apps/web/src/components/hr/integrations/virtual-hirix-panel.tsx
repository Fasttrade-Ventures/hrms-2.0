import Link from "next/link";

import { PortalSectionCard } from "@/components/portal/portal-section";

export function VirtualHirixPanel({ apiKeysTabHref }: { apiKeysTabHref: string }) {
  return (
    <div className="space-y-4">
      <PortalSectionCard
        description="Connect Virtual Hirix to BukuHR using a Developer API key. Sync settings are not hosted here yet."
        title="Virtual Hirix"
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Create an API key under the{" "}
            <Link className="font-medium text-primary" href={apiKeysTabHref}>
              API keys
            </Link>{" "}
            tab.
          </li>
          <li>Copy the base URL shown on that tab (ends with <code className="text-xs">/api/v1</code>).</li>
          <li>In Virtual Hirix, paste the base URL and API key into the BukuHR / HRMS connector settings.</li>
          <li>Use employee, leave, and payroll read endpoints as documented for your tenant.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Need a deeper connector later? We can add Virtual Hirix-specific credentials here without a new sidebar
          item.
        </p>
      </PortalSectionCard>
    </div>
  );
}
