"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { HrFilterButton } from "@/components/hr/hr-ui.client";
import type { EmployeeBranchFilter } from "@/lib/employees/queries";

function buildHref(params: {
  search?: string;
  status: string;
  branchId: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status !== "active") query.set("status", params.status);
  if (params.branchId !== "all") query.set("branchId", params.branchId);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/hr/employees?${qs}` : "/hr/employees";
}

export function EmployeeDirectoryFilters({
  search,
  status,
  branchId,
  activeTotal,
  branches,
  inactiveCount,
}: {
  search?: string;
  status: string;
  branchId: string;
  activeTotal: number;
  branches: EmployeeBranchFilter[];
  inactiveCount: number;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-2.5 py-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Branch
          </span>
          <HrFilterButton
            active={status === "active" && branchId === "all"}
            href={buildHref({ search, status: "active", branchId: "all" })}
          >
            All ({activeTotal})
          </HrFilterButton>
          {branches.map((branch) => (
            <HrFilterButton
              active={status === "active" && branchId === branch.id}
              href={buildHref({ search, status: "active", branchId: branch.id })}
              key={branch.id}
            >
              {branch.name} ({branch.count})
            </HrFilterButton>
          ))}
          <HrFilterButton
            active={status === "inactive"}
            href={buildHref({ search, status: "inactive", branchId: "all" })}
          >
            {inactiveCount > 0 ? `Inactive (${inactiveCount})` : "Inactive"}
          </HrFilterButton>
        </div>

        <Separator className="hidden sm:block sm:h-7" orientation="vertical" />

        <form
          action="/hr/employees"
          className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto"
          method="get"
        >
          {status !== "active" ? <input name="status" type="hidden" value={status} /> : null}
          {branchId !== "all" ? <input name="branchId" type="hidden" value={branchId} /> : null}
          <Input
            aria-label="Search employees"
            className="h-8 w-full min-w-0 sm:w-52"
            defaultValue={search ?? ""}
            id="employeeSearch"
            name="search"
            placeholder="Search name, email, or ID…"
            type="search"
          />
          <Button className="h-8 shrink-0 px-3" size="sm" type="submit">
            Search
          </Button>
          {search ? (
            <Button
              className="h-8 shrink-0 px-3"
              render={<Link href={buildHref({ status, branchId })} />}
              size="sm"
              variant="outline"
            >
              Clear
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
