import { EmptyState } from "@hrms/ui";

import { AnnouncementComposeForm } from "@/components/hr/announcements/announcement-compose-form";
import { AnnouncementTable } from "@/components/hr/announcements/announcement-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireModule } from "@/lib/entitlements";
import { listHrAnnouncements } from "@/lib/hr/announcements";
import { listBranchOptions, listDepartments } from "@/lib/hr/organization";
import { requireRole } from "@/lib/auth/session";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireRole("hr_administrator");
  requireModule("announcements");

  const { view } = await searchParams;

  const [announcements, branches, departments] = await Promise.all([
    listHrAnnouncements().catch(() => []),
    listBranchOptions().catch(() => []),
    listDepartments().catch(() => []),
  ]);

  const departmentOptions = departments.map((row) => ({ id: row.id, name: row.name }));

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Draft, schedule, or publish announcements with optional attachments and audience targeting."
        title="Announcements"
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Create announcement</CardTitle>
          <CardDescription>
            Target by branch, role, and/or department. Leave filters empty to reach everyone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementComposeForm branches={branches} departments={departmentOptions} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">All announcements ({announcements.length})</h2>
        {announcements.length === 0 ? (
          <EmptyState description="Published and draft announcements will appear here." title="No announcements" />
        ) : (
          <AnnouncementTable
            announcements={announcements}
            branches={branches}
            departments={departmentOptions}
            initialViewId={view}
          />
        )}
      </div>
    </div>
  );
}
