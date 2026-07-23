import Link from "next/link";

import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icons";
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
};

export function OrganizationHub({ data }: { data: OrgHubData }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] px-6 py-7 shadow-[var(--shadow-card)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 100% 0%, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 55%), linear-gradient(135deg, var(--surface-muted) 0%, var(--surface-card) 55%)",
          }}
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              Structure & policies
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground-primary)]">
              Organization overview
            </h2>
            <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">
              Configure the catalogs employees, leave, and attendance rely on. Use the sidebar
              Organization menu to jump between areas, or open a card below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              href="/hr/organization/branches/create"
            >
              Add branch
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/organization/leave-types"
            >
              Leave types
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Branches", value: data.branchCount },
          { label: "Departments", value: data.departmentCount },
          { label: "Shifts", value: data.shiftCount },
          { label: "Holidays", value: data.holidayCount },
          { label: "Leave types", value: data.leaveTypeCount },
        ].map((stat) => (
          <div
            className="rounded-[14px] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-3.5 shadow-[var(--shadow-card)]"
            key={stat.label}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground-primary)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.modules.map((module) => {
          const meta = areaMeta[module.id];
          return (
            <article
              className="flex flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]"
              key={module.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]">
                  <PortalIcon name={meta?.icon ?? "organization"} />
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--foreground-secondary)]">
                  {module.count}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground-primary)]">
                {module.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">{module.subtitle}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--foreground-secondary)]">
                {meta?.blurb ?? module.details}
              </p>
              <p className="mt-2 truncate text-xs text-[var(--foreground-muted)]">{module.details}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  href={module.href}
                >
                  {meta?.cta ?? "Open"}
                </Link>
                {meta?.createHref ? (
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
                    href={meta.createHref}
                  >
                    Add
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
