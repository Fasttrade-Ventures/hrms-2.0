"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { EmptyState } from "@hrms/ui";

import {
  submitBehalfLate,
  submitBehalfLeave,
  type ApplyBehalfActionState,
} from "@/app/(hr)/hr/apply-behalf/actions";
import { ApplyBehalfFilters } from "@/components/hr/apply-behalf/apply-behalf-filters";
import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import {
  HrBanner,
  HrStatCards,
  HrTableCard,
} from "@/components/hr/hr-ui";
import {
  HrLinkButton,
  HrPagination,
} from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getBehalfApplicationPath,
  type BehalfApplicationDetail,
  type BehalfApplicationRow,
  type BehalfListData,
} from "@/lib/hr/apply-behalf-shared";

const BEHALF_TABLE_GRID =
  "md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,1fr)_5rem_4.5rem] md:items-center md:gap-x-3";

const BEHALF_TABLE_ROW = `px-3.5 py-2.5 ${BEHALF_TABLE_GRID}`;

function formatAppliedAt(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildListHref(params: {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/hr/apply-behalf?${qs}` : "/hr/apply-behalf";
}

export function ApplyBehalfList({
  data,
  type,
  dateFrom,
  dateTo,
  page,
  pageSize,
  total,
  banner,
}: {
  data: BehalfListData;
  type: "all" | "leave" | "late";
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
  total: number;
  banner?: string;
}) {
  const listParams = { type, dateFrom, dateTo };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, page - 2), pageCount - 4);
    return start + index;
  });
  const hasDateFilter = Boolean(dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<HrLinkButton href="/hr/apply-behalf/new">New application</HrLinkButton>}
        description="Submit leave or late for any employee · auto-approved"
        title="Apply on behalf"
      />

      {banner ? <HrBanner>{banner}</HrBanner> : null}

      <HrStatCards
        items={[
          { hint: "HR submitted", label: "Behalf apps", value: data.stats.total },
          { hint: "auto-approved", label: "Leave submitted", value: data.stats.leaveCount },
          { hint: "auto-approved", label: "Late submitted", value: data.stats.lateCount },
        ]}
      />

      <ApplyBehalfFilters dateFrom={dateFrom} dateTo={dateTo} type={type} />

      <HrTableCard>
        <div
          className={`hidden border-b bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${BEHALF_TABLE_ROW}`}
        >
          <span className="truncate">Type</span>
          <span className="truncate">Employee</span>
          <span className="truncate">Details</span>
          <span className="truncate">Applied</span>
          <span className="truncate">Status</span>
          <span className="truncate">Action</span>
        </div>
        {data.rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              description={
                hasDateFilter || type !== "all"
                  ? "Try adjusting your filters or date range."
                  : "Use New application to submit leave or late for any employee."
              }
              title={
                total === 0 && (hasDateFilter || type !== "all")
                  ? "No applications match your filters"
                  : "No behalf applications yet"
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.rows.map((row) => (
              <BehalfRow key={`${row.type}-${row.id}`} row={row} />
            ))}
          </div>
        )}
      </HrTableCard>

      <HrPagination
        from={from}
        itemLabel="applications"
        nextHref={
          page < pageCount ? buildListHref({ ...listParams, page: page + 1 }) : undefined
        }
        page={page}
        pageLinks={pages.map((pageNumber) => ({
          page: pageNumber,
          href: buildListHref({ ...listParams, page: pageNumber }),
        }))}
        prevHref={page > 1 ? buildListHref({ ...listParams, page: page - 1 }) : undefined}
        to={to}
        total={total}
      />
    </div>
  );
}

function BehalfRow({ row }: { row: BehalfApplicationRow }) {
  return (
    <div className={BEHALF_TABLE_ROW}>
      <div className="flex w-fit items-center justify-self-start">
        <Badge variant={row.type === "leave" ? "default" : "destructive"}>
          {row.type === "leave" ? "Leave" : "Late"}
        </Badge>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{row.employeeName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{row.employeeNumber}</p>
      </div>
      <p className="min-w-0 truncate text-sm text-muted-foreground">{row.details}</p>
      <p className="min-w-0 truncate text-sm text-muted-foreground">
        {formatAppliedAt(row.appliedAt)}
      </p>
      <div className="flex w-fit items-center justify-self-start">
        <Badge variant="secondary">
          {row.status === "approved" ? "Approved" : row.status}
        </Badge>
      </div>
      <div className="flex items-center justify-self-start">
        <HrLinkButton href={getBehalfApplicationPath(row.type, row.id)} size="sm" variant="outline">
          View
        </HrLinkButton>
      </div>
    </div>
  );
}

function formatDetailDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ApplyBehalfDetail({ application }: { application: BehalfApplicationDetail }) {
  const isLeave = application.type === "leave";

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/apply-behalf" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description={`Submitted ${formatAppliedAt(application.appliedAt)} · auto-approved on behalf`}
        title={isLeave ? application.leaveTypeName : "Late report"}
      />

      <HrStatCards
        items={[
          { label: "Type", value: isLeave ? "Leave" : "Late" },
          {
            label: "Status",
            value: application.status === "approved" ? "Approved" : application.status,
          },
          { label: "Employee", value: application.employeeName },
          { label: "Submitted by", value: application.submittedByName ?? "HR administrator" },
        ]}
      />

      <Card>
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>Application details</CardTitle>
          <p className="text-xs text-muted-foreground">
            HR-submitted {isLeave ? "leave" : "late"} request for {application.employeeNumber}
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <DetailField label="Employee" value={application.employeeName} />
          <DetailField label="Employee no." value={application.employeeNumber || "—"} />
          {isLeave ? (
            <>
              <DetailField label="Leave type" value={application.leaveTypeName} />
              <DetailField label="Days" value={String(application.days)} />
              <DetailField label="Start date" value={formatDetailDate(application.startDate)} />
              <DetailField label="End date" value={formatDetailDate(application.endDate)} />
              <DetailField label="Half day" value={application.halfDay ? "Yes" : "No"} />
            </>
          ) : (
            <>
              <DetailField label="Date" value={formatDetailDate(application.requestDate)} />
              <DetailField label="Actual arrival" value={application.actualArrivalTime} />
            </>
          )}
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Reason</p>
            <p className="text-sm text-foreground">
              {application.reason?.trim() || "No reason provided."}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
          <Badge variant="secondary">
            {application.status === "approved" ? "Approved" : application.status}
          </Badge>
          <Button render={<Link href={`/hr/employees/${application.employeeId}`} />} variant="link">
            View employee profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

const initialState: ApplyBehalfActionState = {};

export function ApplyBehalfForm({
  employees,
  leaveTypes,
}: {
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
  leaveTypes: Array<{ id: string; name: string }>;
}) {
  const [kind, setKind] = useState<"leave" | "late">("leave");
  const [leaveState, leaveAction, leavePending] = useActionState(submitBehalfLeave, initialState);
  const [lateState, lateAction, latePending] = useActionState(submitBehalfLate, initialState);
  const today = new Date().toISOString().slice(0, 10);
  const pending = kind === "leave" ? leavePending : latePending;
  const state = kind === "leave" ? leaveState : lateState;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/apply-behalf" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Requests are saved as approved — no manager queue."
        title="New application"
      />

      <Card className="overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-primary text-primary-foreground">
          <div className="space-y-0.5">
            <CardTitle className="text-primary-foreground">Apply on behalf</CardTitle>
            <p className="text-xs text-primary-foreground/80">Leave or late · auto-approved</p>
          </div>
          <Button
            aria-label="Close"
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            render={<Link href="/hr/apply-behalf" />}
            size="icon-sm"
            variant="ghost"
          >
            ✕
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 py-5">
          <ToggleGroup
            onValueChange={(values) => {
              const next = values.at(-1) as "leave" | "late" | undefined;
              if (next) setKind(next);
            }}
            spacing={0}
            value={[kind]}
            variant="outline"
          >
            <ToggleGroupItem aria-label="Leave application" value="leave">
              Leave
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Late application" value="late">
              Late
            </ToggleGroupItem>
          </ToggleGroup>

          <form action={kind === "leave" ? leaveAction : lateAction} className="space-y-5">
            <HrField id="employeeId" label="Employee">
              <HrSelect defaultValue="" id="employeeId" name="employeeId" required>
                <option value="">-- Select employee --</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_number})
                  </option>
                ))}
              </HrSelect>
            </HrField>

            {kind === "leave" ? (
              <>
                <HrField id="leaveTypeId" label="Leave type">
                  <HrSelect defaultValue="" id="leaveTypeId" name="leaveTypeId" required>
                    <option value="">-- Select --</option>
                    {leaveTypes.map((leaveType) => (
                      <option key={leaveType.id} value={leaveType.id}>
                        {leaveType.name}
                      </option>
                    ))}
                  </HrSelect>
                </HrField>
                <div className="grid gap-4 md:grid-cols-2">
                  <HrField id="startDate" label="Start date">
                    <HrTextInput defaultValue={today} id="startDate" name="startDate" required type="date" />
                  </HrField>
                  <HrField id="endDate" label="End date">
                    <HrTextInput defaultValue={today} id="endDate" name="endDate" required type="date" />
                  </HrField>
                </div>
                <HrCheckbox id="halfDay" label="Half day" name="halfDay" />
                <HrField id="reason" label="Reason">
                  <HrTextInput id="reason" name="reason" placeholder="Optional" />
                </HrField>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <HrField id="requestDate" label="Date">
                    <HrTextInput
                      defaultValue={today}
                      id="requestDate"
                      name="requestDate"
                      required
                      type="date"
                    />
                  </HrField>
                  <HrField id="actualArrivalTime" label="Actual arrival time">
                    <HrTextInput id="actualArrivalTime" name="actualArrivalTime" required type="time" />
                  </HrField>
                </div>
                <HrField id="reason" label="Reason">
                  <HrTextInput id="reason" name="reason" placeholder="Optional" />
                </HrField>
              </>
            )}

            <HrFormMessage error={state.error} success={state.success} />

            <div className="flex justify-end gap-2 border-t pt-4">
              <HrLinkButton href="/hr/apply-behalf" variant="outline">
                Cancel
              </HrLinkButton>
              <HrPrimaryButton disabled={pending} type="submit">
                {pending ? "Submitting…" : "Submit (auto-approve)"}
              </HrPrimaryButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
