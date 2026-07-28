import { StatCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type {
  HeadcountMetrics,
  LeaveLiabilityMetrics,
  PayrollCostMetrics,
  RecruitmentMetrics,
} from "@/lib/analytics/queries";

export function AnalyticsDashboard({
  headcount,
  leave,
  payroll,
  recruitment,
}: {
  headcount: HeadcountMetrics;
  leave: LeaveLiabilityMetrics;
  payroll: PayrollCostMetrics;
  recruitment?: RecruitmentMetrics;
}) {
  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Headcount, leave liability, and payroll cost across your organization."
        title="Analytics"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active headcount" value={String(headcount.total)} />
        <StatCard
          hint={`${leave.totalRemainingDays} days remaining`}
          label="Leave liability (est.)"
          value={`RM ${leave.estimatedLiabilityRm.toLocaleString()}`}
        />
        <StatCard
          hint={payroll.lastPayrunLabel ?? "No locked payrun"}
          label="Last payrun net"
          value={`RM ${Math.round(payroll.lastPayrunNet).toLocaleString()}`}
        />
        <StatCard
          hint={`Gross YTD RM ${Math.round(payroll.ytdGross).toLocaleString()}`}
          label="Payroll YTD net"
          value={`RM ${Math.round(payroll.ytdNet).toLocaleString()}`}
        />
      </div>

      {recruitment ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Open requisitions" value={String(recruitment.openRequisitions)} />
          <StatCard label="Active candidates" value={String(recruitment.activeCandidates)} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <PortalSectionCard title="Headcount by branch">
          <ul className="space-y-2 text-sm">
            {headcount.byBranch.map((row) => (
              <li className="flex justify-between" key={row.id}>
                <span>{row.name}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </PortalSectionCard>
        <PortalSectionCard title="Headcount by department">
          <ul className="space-y-2 text-sm">
            {headcount.byDepartment.map((row) => (
              <li className="flex justify-between" key={row.id}>
                <span>{row.name}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </PortalSectionCard>
      </div>
    </div>
  );
}
