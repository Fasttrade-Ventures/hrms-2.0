import Link from "next/link";

import { HrStatCards } from "@/components/hr/hr-ui";
import { PortalIcon } from "@/components/portal/portal-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocumentsHubStats } from "@/lib/hr/documents";

const modules = [
  {
    id: "library",
    title: "Document library",
    subtitle: "Browse, upload, and download employee files",
    href: "/hr/documents/library",
    icon: "documents" as const,
  },
  {
    id: "folders",
    title: "Folders",
    subtitle: "Organize documents with role-based visibility",
    href: "/hr/documents/folders",
    icon: "organization" as const,
  },
  {
    id: "required",
    title: "Required documents",
    subtitle: "Define mandatory document types per organization",
    href: "/hr/documents/required",
    icon: "audit" as const,
  },
  {
    id: "compliance",
    title: "Compliance matrix",
    subtitle: "Track missing and expiring required documents",
    href: "/hr/documents/compliance",
    icon: "team-performance" as const,
  },
];

export function DocumentsHub({ stats }: { stats: DocumentsHubStats }) {
  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-muted-foreground">
            Browse the library, manage folders and required types, or review compliance gaps.
          </p>
          <Button render={<Link href="/hr/documents/library" />} size="sm">
            Open library
          </Button>
        </CardContent>
      </Card>

      <HrStatCards
        compact
        columns={5}
        items={[
          { label: "Documents", value: stats.totalDocuments },
          { label: "Expiring (30d)", value: stats.expiringCount },
          { label: "Compliance gaps", value: stats.missingComplianceCount },
          { label: "Folders", value: stats.folderCount },
          { label: "Required types", value: stats.requiredTypeCount },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <Card className="flex flex-col" key={module.id} size="sm">
            <CardHeader className="pb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <PortalIcon name={module.icon} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-1 pb-2">
              <CardTitle className="text-sm">{module.title}</CardTitle>
              <CardDescription>{module.subtitle}</CardDescription>
            </CardContent>
            <CardFooter className="border-t-0 bg-transparent pt-0">
              <Button className="w-full" render={<Link href={module.href} />} size="sm" variant="outline">
                Open
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden py-0" size="sm">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm">Recent uploads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentDocuments.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentDocuments.map((doc) => (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={doc.id}>
                  <div>
                    <p className="font-medium">{doc.documentType}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.employeeName} · {doc.fileName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.expiresAt ? <Badge variant="outline">Expires {doc.expiresAt}</Badge> : null}
                    <Button render={<Link href={`/api/files/${doc.fileId}/download`} />} size="sm" variant="outline">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
