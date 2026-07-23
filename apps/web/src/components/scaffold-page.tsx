import { Placeholder } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";

export function ScaffoldPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <PortalPageHeader description={description} title={title} />
      <Placeholder label={`Scaffold: ${title}`} />
    </div>
  );
}
