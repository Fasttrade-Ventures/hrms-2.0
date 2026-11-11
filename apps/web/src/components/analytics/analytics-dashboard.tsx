"use client";

import { useState, useTransition } from "react";
import { StatCard } from "@hrms/ui";

import { loadAnalyticsDetailAction } from "@/app/(hr)/hr/analytics/actions";
import { AnalyticsDetailDrawer } from "@/components/analytics/analytics-detail-drawer";
import { AnalyticsFilters, type FilterOption } from "@/components/analytics/analytics-filters";
import {
  DonutChart,
  DualLineChart,
  HorizontalBarChart,
  SingleBarChart,
  StackedLikeBarChart,
  VerticalBarChart,
} from "@/components/analytics/charts/simple-charts";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { AnalyticsCockpit, AnalyticsChartKey, AnalyticsDetail } from "@/lib/analytics/queries";

export function AnalyticsDashboard({
  cockpit,
  branches,
  departments,
  showRecruitment,
}: {
  cockpit: AnalyticsCockpit;
  branches: FilterOption[];
  departments: FilterOption[];
  showRecruitment: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AnalyticsDetail | null>(null);
  const [pending, startTransition] = useTransition();

  function openDetail(chartKey: AnalyticsChartKey, segmentKey: string) {
    if (!segmentKey) return;
    setDetailOpen(true);
    setDetail(null);
    startTransition(async () => {
      const next = await loadAnalyticsDetailAction({
        chartKey,
        segmentKey,
        period: cockpit.filters.period,
        branchId: cockpit.filters.branchId,
        departmentId: cockpit.filters.departmentId,
      });
      setDetail(next);
    });
  }

  const branchBars = cockpit.headcountByBranch.map((row) => ({
    id: row.id,
    name: row.name,
    count: row.count,
  }));
  const leaveLiabilityBars = cockpit.leaveLiabilityByDepartment.map((row) => ({
    id: row.id,
    name: row.name,
    count: row.count,
  }));
  const funnelBars = cockpit.recruitmentByStage.map((row) => ({
    id: row.key,
    name: row.key,
    count: row.count,
  }));

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Workforce, leave, payroll, and hiring signals across your organization."
        title="Analytics"
      />

      <AnalyticsFilters
        branchId={cockpit.filters.branchId}
        branches={branches}
        departmentId={cockpit.filters.departmentId}
        departments={departments}
        period={cockpit.filters.period}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active headcount" value={String(cockpit.kpis.activeHeadcount)} />
        <StatCard hint="In selected period" label="Joiners" value={String(cockpit.kpis.joiners)} />
        <StatCard hint="Best-effort exits" label="Leavers" value={String(cockpit.kpis.leavers)} />
        <StatCard
          hint={`${cockpit.kpis.leaveRemainingDays} days remaining`}
          label="Leave liability (est.)"
          value={`RM ${cockpit.kpis.leaveLiabilityRm.toLocaleString()}`}
        />
        <StatCard
          hint={cockpit.kpis.lastPayrunLabel ?? "No locked payrun"}
          label="Last payrun net"
          value={`RM ${cockpit.kpis.lastPayrunNet.toLocaleString()}`}
        />
        {showRecruitment ? (
          <StatCard
            hint={`${cockpit.kpis.activeCandidates} active candidates`}
            label="Open requisitions"
            value={String(cockpit.kpis.openRequisitions)}
          />
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Workforce</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <VerticalBarChart
            data={branchBars}
            dataKey="count"
            onSelect={(id) => openDetail("headcount_branch", id)}
            title="Headcount by branch"
          />
          <DonutChart
            data={cockpit.headcountByDepartment}
            onSelect={(id) => openDetail("headcount_dept", id)}
            title="Headcount by department"
          />
          <DualLineChart
            data={cockpit.joinersLeaversByMonth}
            leftKey="joiners"
            onSelect={(key) => openDetail("joiners_leavers", key)}
            rightKey="leavers"
            title="Joiners vs leavers"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Leave</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <SingleBarChart
            data={cockpit.leaveDaysByMonth}
            dataKey="days"
            onSelect={(month) => openDetail("leave_days", month)}
            title="Leave days taken by month"
          />
          <HorizontalBarChart
            data={leaveLiabilityBars}
            dataKey="count"
            onSelect={(id) => openDetail("leave_liability", id)}
            title="Leave liability by department"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Payroll</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <DualLineChart
            data={cockpit.payrollByMonth}
            leftKey="gross"
            onSelect={(key) => openDetail("payroll_monthly", key)}
            rightKey="net"
            title="Gross / net by month"
          />
          <StackedLikeBarChart
            data={cockpit.payrollComposition}
            onSelect={(name) => openDetail("payroll_composition", name)}
            title="Last payrun composition"
          />
        </div>
      </section>

      {showRecruitment ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recruitment</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <HorizontalBarChart
              data={funnelBars}
              dataKey="count"
              onSelect={(key) => openDetail("recruitment_funnel", key)}
              title="Pipeline by stage"
            />
            <VerticalBarChart
              data={cockpit.recruitmentOpenVsCandidates}
              dataKey="value"
              onSelect={(name) => openDetail("recruitment_open", name)}
              title="Open roles vs active candidates"
            />
          </div>
        </section>
      ) : null}

      <AnalyticsDetailDrawer
        detail={detail}
        loading={pending}
        onClose={() => setDetailOpen(false)}
        open={detailOpen}
      />
    </div>
  );
}
