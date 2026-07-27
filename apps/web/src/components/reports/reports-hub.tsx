import Link from "next/link";

import { PortalIcon } from "@/components/portal/portal-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REPORT_CATALOG } from "@/lib/reports/catalog";

const QUICK_EXPORTS = [
  {
    id: "calendar",
    title: "Calendar events CSV",
    subtitle: "Export leave and company events from the HR calendar",
    href: "/hr/calendar",
    icon: "calendar" as const,
  },
  {
    id: "compliance",
    title: "Document compliance CSV",
    subtitle: "Export the compliance matrix from Documents",
    href: "/hr/documents/compliance",
    icon: "documents" as const,
  },
  {
    id: "assets",
    title: "Asset register CSV",
    subtitle: "Export the full asset register",
    href: "/hr/assets",
    icon: "assets" as const,
  },
];

export function ReportsHub({
  portal,
  basePath,
}: {
  portal: "hr" | "director";
  basePath: string;
}) {
  const payrollHref = portal === "hr" ? "/hr/payroll" : undefined;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Operational reports</h2>
          <p className="text-sm text-muted-foreground">
            Filterable tables with CSV download and print for each report.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_CATALOG.map((report) => (
            <Card className="flex flex-col" key={report.slug} size="sm">
              <CardHeader className="pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                  <PortalIcon name="reports" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-1 pb-2">
                <CardTitle className="text-sm">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
              <CardFooter className="border-t-0 bg-transparent pt-0">
                <Button
                  className="w-full"
                  render={<Link href={`${basePath}/${report.slug}`} />}
                  size="sm"
                  variant="outline"
                >
                  Open report
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Quick exports</h2>
          <p className="text-sm text-muted-foreground">
            Jump to module pages with native export actions.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {QUICK_EXPORTS.map((item) => (
            <Card className="flex flex-col" key={item.id} size="sm">
              <CardHeader className="pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                  <PortalIcon name={item.icon} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-1 pb-2">
                <CardTitle className="text-sm">{item.title}</CardTitle>
                <CardDescription>{item.subtitle}</CardDescription>
              </CardContent>
              <CardFooter className="border-t-0 bg-transparent pt-0">
                <Button
                  className="w-full"
                  render={<Link href={item.href} />}
                  size="sm"
                  variant="outline"
                >
                  Go to module
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {payrollHref ? (
        <Card size="sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">Payroll & statutory</p>
              <p className="text-sm text-muted-foreground">
                EPF, SOCSO, PCB, and pay-run exports are generated from Payroll.
              </p>
            </div>
            <Button render={<Link href={payrollHref} />} size="sm">
              Go to Payroll
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
