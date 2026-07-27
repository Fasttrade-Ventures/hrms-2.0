import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icons";
import { HrStatCards } from "@/components/hr/hr-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgHubData } from "@/lib/hr/organization";

const areaMeta: Record<
  string,
  { icon: PortalIconName; blurb: string; cta: string; createHref?: string }
> = {
  branches: {
    icon: "organization",
    blurb: "Sites, weekend mode, and payroll cutoff day.",
    cta: "Manage branches",
    createHref: "/hr/organization/branches/create",
  },
  departments: {
    icon: "team-performance",
    blurb: "Teams optionally scoped to a branch.",
    cta: "Manage departments",
    createHref: "/hr/organization/departments/create",
  },
  shifts: {
    icon: "attendance",
    blurb: "Attendance patterns assigned on employee profiles.",
    cta: "Manage shifts",
    createHref: "/hr/organization/shifts/create",
  },
  holidays: {
    icon: "calendar",
    blurb: "Public and company holidays for working-day calc.",
    cta: "Manage holidays",
    createHref: "/hr/organization/holidays/create",
  },
  "leave-types": {
    icon: "leave",
    blurb: "Leave policies, entitlements, and attachment rules.",
    cta: "Manage leave types",
    createHref: "/hr/organization/leave-types/create",
  },
  "asset-categories": {
    icon: "assets",
    blurb: "Asset types and custom fields for the register.",
    cta: "Manage asset categories",
    createHref: "/hr/organization/asset-categories/create",
  },
};

export function OrganizationHub({ data }: { data: OrgHubData }) {
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 100% 0%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 55%), linear-gradient(135deg, var(--muted) 0%, var(--card) 55%)",
          }}
        />
        <CardContent className="relative flex flex-col gap-5 py-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Structure & policies
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Organization overview
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Configure the catalogs employees, leave, and attendance rely on. Use the sidebar
              Organization menu to jump between areas, or open a card below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <HrLinkButton href="/hr/organization/branches/create">Add branch</HrLinkButton>
            <HrLinkButton href="/hr/organization/leave-types" variant="outline">
              Leave types
            </HrLinkButton>
          </div>
        </CardContent>
      </Card>

      <HrStatCards
        columns={5}
        items={[
          { label: "Branches", value: data.branchCount },
          { label: "Departments", value: data.departmentCount },
          { label: "Shifts", value: data.shiftCount },
          { label: "Holidays", value: data.holidayCount },
          { label: "Leave types", value: data.leaveTypeCount },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.modules.map((module) => {
          const meta = areaMeta[module.id];
          return (
            <Card className="flex flex-col" key={module.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent text-primary">
                  <PortalIcon name={meta?.icon ?? "organization"} />
                </div>
                <Badge variant="secondary">{module.count}</Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <CardTitle>{module.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{module.subtitle}</p>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {meta?.blurb ?? module.details}
                </p>
                <p className="truncate text-xs text-muted-foreground">{module.details}</p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 border-t-0 bg-transparent pt-0">
                <HrLinkButton className="flex-1" href={module.href}>
                  {meta?.cta ?? "Open"}
                </HrLinkButton>
                {meta?.createHref ? (
                  <HrLinkButton href={meta.createHref} variant="outline">
                    Add
                  </HrLinkButton>
                ) : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
