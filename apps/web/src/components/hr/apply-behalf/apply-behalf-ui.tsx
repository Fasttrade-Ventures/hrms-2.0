"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { EmptyState } from "@hrms/ui";

import {
  submitBehalfClaim,
  submitBehalfLate,
  submitBehalfLeave,
  submitBehalfOvertime,
  submitBehalfReplacementCredit,
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
  type BehalfApplicationType,
  type BehalfListData,
} from "@/lib/hr/apply-behalf-shared";
import { formatDate, formatDateTime } from "@/components/employee/employee-shared";

const BEHALF_TABLE_GRID =
  "md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,1fr)_5rem_4.5rem] md:items-center md:gap-x-3";

const BEHALF_TABLE_ROW = `px-3.5 py-2.5 ${BEHALF_TABLE_GRID}`;

function formatAppliedAt(value: string) {
  return formatDateTime(value);
}

function buildListHref(
  basePath: string,
  params: {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  },
) {
  const query = new URLSearchParams();
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
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
  basePath = "/hr/apply-behalf",
}: {
  data: BehalfListData;
  type: "all" | BehalfApplicationType;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
  total: number;
  banner?: string;
  basePath?: string;
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
        actions={<HrLinkButton href={`${basePath}/new`}>New application</HrLinkButton>}
        description="Submit requests on behalf of staff · auto-approved"
        title="Apply on behalf"
      />

      {banner ? <HrBanner>{banner}</HrBanner> : null}

      <HrStatCards
        items={[
          { hint: "on behalf", label: "Total apps", value: data.stats.total },
          { hint: "auto-approved", label: "Leave", value: data.stats.leaveCount },
          { hint: "auto-approved", label: "Late", value: data.stats.lateCount },
          { hint: "auto-approved", label: "Claims", value: data.stats.claimCount },
          { hint: "auto-approved", label: "Overtime", value: data.stats.otCount },
          { hint: "auto-approved", label: "Replacement", value: data.stats.replacementCount },
        ]}
      />

      <ApplyBehalfFilters basePath={basePath} dateFrom={dateFrom} dateTo={dateTo} type={type} />

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
                  : "Use New application to submit requests on behalf of staff."
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
              <BehalfRow basePath={basePath} key={`${row.type}-${row.id}`} row={row} />
            ))}
          </div>
        )}
      </HrTableCard>

      <HrPagination
        from={from}
        itemLabel="applications"
        nextHref={
          page < pageCount ? buildListHref(basePath, { ...listParams, page: page + 1 }) : undefined
        }
        page={page}
        pageLinks={pages.map((pageNumber) => ({
          page: pageNumber,
          href: buildListHref(basePath, { ...listParams, page: pageNumber }),
        }))}
        prevHref={page > 1 ? buildListHref(basePath, { ...listParams, page: page - 1 }) : undefined}
        to={to}
        total={total}
      />
    </div>
  );
}

function BehalfRow({ row, basePath }: { row: BehalfApplicationRow; basePath: string }) {
  const typeLabel =
    row.type === "leave"
      ? "Leave"
      : row.type === "late"
        ? "Late"
        : row.type === "claim"
          ? "Claim"
          : row.type === "overtime"
            ? "Overtime"
            : "Replacement";

  return (
    <div className={BEHALF_TABLE_ROW}>
      <div className="flex w-fit items-center justify-self-start">
        <Badge variant="outline">{typeLabel}</Badge>
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
        <Badge variant={row.status === "approved" ? "success" : "secondary"}>
          {row.status === "approved" ? "Approved" : row.status}
        </Badge>
      </div>
      <div className="flex items-center justify-self-start">
        <HrLinkButton
          href={getBehalfApplicationPath(row.type, row.id, basePath)}
          size="sm"
          variant="outline"
        >
          View
        </HrLinkButton>
      </div>
    </div>
  );
}

function formatDetailDate(value: string) {
  return formatDate(value);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ApplyBehalfDetail({
  application,
  listHref = "/hr/apply-behalf",
}: {
  application: BehalfApplicationDetail;
  listHref?: string;
}) {
  const isLeave = application.type === "leave";
  const isLate = application.type === "late";
  const isClaim = application.type === "claim";
  const isOvertime = application.type === "overtime";
  const isReplacement = application.type === "replacement";

  let title = "Application detail";
  let typeLabel = "Application";

  if (isLeave) {
    title = application.leaveTypeName;
    typeLabel = "Leave";
  } else if (isLate) {
    title = "Late report";
    typeLabel = "Late";
  } else if (isClaim) {
    title = `${application.claimTypeName} (RM ${application.amount.toFixed(2)})`;
    typeLabel = "Claim";
  } else if (isOvertime) {
    title = `Overtime (${application.hours}h @ ${application.rateType}x)`;
    typeLabel = "Overtime";
  } else if (isReplacement) {
    title = `Replacement credit (${application.creditDays}d)`;
    typeLabel = "Replacement";
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href={listHref} variant="outline">
            Back to list
          </HrLinkButton>
        }
        description={`Submitted ${formatAppliedAt(application.appliedAt)} · auto-approved on behalf`}
        title={title}
      />

      <HrStatCards
        items={[
          { label: "Type", value: typeLabel },
          {
            label: "Status",
            value: application.status === "approved" ? "Approved" : application.status,
          },
          { label: "Employee", value: application.employeeName },
          { label: "Submitted by", value: application.submittedByName ?? "Administrator" },
        ]}
      />

      <Card>
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>Application details</CardTitle>
          <p className="text-xs text-muted-foreground">
            Submitted {typeLabel.toLowerCase()} request for {application.employeeNumber}
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <DetailField label="Employee" value={application.employeeName} />
          <DetailField label="Employee no." value={application.employeeNumber || "N/A"} />

          {isLeave ? (
            <>
              <DetailField label="Leave type" value={application.leaveTypeName} />
              <DetailField label="Days" value={String(application.days)} />
              <DetailField label="Start date" value={formatDetailDate(application.startDate)} />
              <DetailField label="End date" value={formatDetailDate(application.endDate)} />
              <DetailField label="Half day" value={application.halfDay ? "Yes" : "No"} />
            </>
          ) : null}

          {isLate ? (
            <>
              <DetailField label="Date" value={formatDetailDate(application.requestDate)} />
              <DetailField label="Actual arrival" value={application.actualArrivalTime} />
            </>
          ) : null}

          {isClaim ? (
            <>
              <DetailField label="Claim type" value={application.claimTypeName} />
              <DetailField label="Amount" value={`RM ${application.amount.toFixed(2)}`} />
              <DetailField label="Receipt date" value={formatDetailDate(application.receiptDate)} />
              {application.isMileage ? (
                <>
                  <DetailField label="Origin" value={application.origin || "N/A"} />
                  <DetailField label="Destination" value={application.destination || "N/A"} />
                  <DetailField label="Distance" value={`${application.distanceKm ?? 0} km`} />
                  <DetailField
                    label="Rate per km"
                    value={`RM ${(application.ratePerKm ?? 0).toFixed(2)}`}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {isOvertime ? (
            <>
              <DetailField label="Work date" value={formatDetailDate(application.workDate)} />
              <DetailField label="Hours" value={`${application.hours} hours`} />
              <DetailField label="Rate type" value={`${application.rateType}x`} />
            </>
          ) : null}

          {isReplacement ? (
            <>
              <DetailField label="Work date" value={formatDetailDate(application.workDate)} />
              <DetailField label="Credit days" value={`${application.creditDays} days`} />
            </>
          ) : null}

          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Reason / Description</p>
            <p className="text-sm text-foreground">
              {application.type === "leave" || application.type === "late" || application.type === "overtime"
                ? application.reason?.trim() || "No reason provided."
                : application.type === "claim"
                  ? application.description?.trim() || "No description provided."
                  : application.type === "replacement"
                    ? application.description?.trim() || "No description provided."
                    : "None"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
          <Badge variant={application.status === "approved" ? "success" : "secondary"}>
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
  leaveTypes = [],
  claimTypes = [],
  leaveAction = submitBehalfLeave,
  lateAction = submitBehalfLate,
  claimAction = submitBehalfClaim,
  overtimeAction = submitBehalfOvertime,
  replacementAction = submitBehalfReplacementCredit,
  listHref = "/hr/apply-behalf",
}: {
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
  leaveTypes?: Array<{ id: string; name: string }>;
  claimTypes?: Array<{
    id: string;
    name: string;
    max_amount: number | null;
    is_mileage?: boolean | null;
    rate_per_km?: number | null;
  }>;
  leaveAction?: typeof submitBehalfLeave;
  lateAction?: typeof submitBehalfLate;
  claimAction?: typeof submitBehalfClaim;
  overtimeAction?: typeof submitBehalfOvertime;
  replacementAction?: typeof submitBehalfReplacementCredit;
  listHref?: string;
}) {
  const [kind, setKind] = useState<BehalfApplicationType>("leave");
  const [leaveState, leaveFormAction, leavePending] = useActionState(leaveAction, initialState);
  const [lateState, lateFormAction, latePending] = useActionState(lateAction, initialState);
  const [claimState, claimFormAction, claimPending] = useActionState(claimAction, initialState);
  const [otState, otFormAction, otPending] = useActionState(overtimeAction, initialState);
  const [replacementState, replacementFormAction, replacementPending] = useActionState(
    replacementAction,
    initialState,
  );

  const [selectedClaimTypeId, setSelectedClaimTypeId] = useState<string>("");
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [manualAmount, setManualAmount] = useState<string>("");

  const selectedClaimType = claimTypes.find((ct) => ct.id === selectedClaimTypeId);
  const isMileageClaim = Boolean(selectedClaimType?.is_mileage);
  const mileageRate = selectedClaimType?.rate_per_km ?? 0.8;
  const calculatedMileageAmount = isMileageClaim && Number(distanceKm) > 0
    ? (Number(distanceKm) * mileageRate).toFixed(2)
    : "";

  const today = new Date().toISOString().slice(0, 10);

  let pending = leavePending;
  let state = leaveState;
  let activeFormAction = leaveFormAction;

  if (kind === "leave") {
    pending = leavePending;
    state = leaveState;
    activeFormAction = leaveFormAction;
  } else if (kind === "late") {
    pending = latePending;
    state = lateState;
    activeFormAction = lateFormAction;
  } else if (kind === "claim") {
    pending = claimPending;
    state = claimState;
    activeFormAction = claimFormAction;
  } else if (kind === "overtime") {
    pending = otPending;
    state = otState;
    activeFormAction = otFormAction;
  } else if (kind === "replacement") {
    pending = replacementPending;
    state = replacementState;
    activeFormAction = replacementFormAction;
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href={listHref} variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Requests are saved as approved without manager routing."
        title="New application"
      />

      <Card className="overflow-hidden py-0">
        <div className="border-b bg-muted/40 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {kind === "leave"
                  ? "Leave application"
                  : kind === "late"
                    ? "Late arrival report"
                    : kind === "claim"
                      ? "Expense or mileage claim"
                      : kind === "overtime"
                        ? "Overtime request"
                        : "Replacement credit"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {kind === "leave"
                  ? "Submit a leave request on behalf of an employee."
                  : kind === "late"
                    ? "Record an employee late arrival with actual arrival time."
                    : kind === "claim"
                      ? "File an expense or mileage reimbursement claim."
                      : kind === "overtime"
                        ? "Record completed overtime hours and pay multiplier."
                        : "Grant replacement rest credit days for work on off-days."}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary sm:self-auto">
              <span className="size-1.5 rounded-full bg-primary" />
              Auto-approved
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-border/50">
            <ToggleGroup
              className="flex w-full flex-wrap sm:w-auto"
              onValueChange={(values) => {
                const next = values.at(-1) as BehalfApplicationType | undefined;
                if (next) setKind(next);
              }}
              spacing={0}
              value={[kind]}
              variant="outline"
            >
              <ToggleGroupItem
                aria-label="Leave application"
                className="flex-1 sm:flex-initial text-xs px-3.5 py-1.5"
                value="leave"
              >
                Leave
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Late application"
                className="flex-1 sm:flex-initial text-xs px-3.5 py-1.5"
                value="late"
              >
                Late
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Claim application"
                className="flex-1 sm:flex-initial text-xs px-3.5 py-1.5"
                value="claim"
              >
                Claim
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Overtime application"
                className="flex-1 sm:flex-initial text-xs px-3.5 py-1.5"
                value="overtime"
              >
                Overtime
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Replacement credit application"
                className="flex-1 sm:flex-initial text-xs px-3.5 py-1.5"
                value="replacement"
              >
                Replacement
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <CardContent className="space-y-5 px-5 py-6">

          <form action={activeFormAction} className="space-y-5">
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
                <HrField
                  id="overrideReason"
                  label="Balance override reason"
                  hint="Required only when the request exceeds remaining leave balance."
                >
                  <HrTextInput
                    id="overrideReason"
                    name="overrideReason"
                    placeholder="Optional unless over balance"
                  />
                </HrField>
              </>
            ) : null}

            {kind === "late" ? (
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
            ) : null}

            {kind === "claim" ? (
              <>
                <HrField id="claimTypeId" label="Claim type">
                  <HrSelect
                    id="claimTypeId"
                    name="claimTypeId"
                    onChange={(e) => setSelectedClaimTypeId(e.target.value)}
                    required
                    value={selectedClaimTypeId}
                  >
                    <option value="">-- Select claim type --</option>
                    {claimTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name} {ct.is_mileage ? "(Mileage)" : ""}
                        {ct.max_amount ? ` · max RM ${ct.max_amount.toFixed(2)}` : ""}
                      </option>
                    ))}
                  </HrSelect>
                </HrField>

                <input
                  name="isMileage"
                  type="hidden"
                  value={isMileageClaim ? "true" : "false"}
                />

                {isMileageClaim ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <HrField id="origin" label="Origin">
                        <HrTextInput
                          id="origin"
                          name="origin"
                          placeholder="e.g. HQ Office"
                          required
                        />
                      </HrField>
                      <HrField id="destination" label="Destination">
                        <HrTextInput
                          id="destination"
                          name="destination"
                          placeholder="e.g. Client Site"
                          required
                        />
                      </HrField>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <HrField
                        hint={`Rate: RM ${mileageRate.toFixed(2)}/km`}
                        id="distanceKm"
                        label="Distance (km)"
                      >
                        <HrTextInput
                          id="distanceKm"
                          name="distanceKm"
                          onChange={(e) => setDistanceKm(e.target.value)}
                          placeholder="e.g. 25"
                          required
                          type="number"
                          value={distanceKm}
                        />
                      </HrField>
                      <HrField id="amount" label="Calculated amount (RM)">
                        <HrTextInput
                          id="amount"
                          name="amount"
                          readOnly
                          required
                          value={calculatedMileageAmount}
                        />
                      </HrField>
                    </div>
                  </>
                ) : (
                  <HrField id="amount" label="Amount (RM)">
                    <HrTextInput
                      id="amount"
                      name="amount"
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      step="0.01"
                      type="number"
                      value={manualAmount}
                    />
                  </HrField>
                )}

                <HrField id="receiptDate" label="Receipt / expense date">
                  <HrTextInput
                    defaultValue={today}
                    id="receiptDate"
                    name="receiptDate"
                    required
                    type="date"
                  />
                </HrField>

                <HrField id="description" label="Description / notes">
                  <HrTextInput
                    id="description"
                    name="description"
                    placeholder="Optional description of the expense"
                  />
                </HrField>
              </>
            ) : null}

            {kind === "overtime" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <HrField id="workDate" label="Work date">
                    <HrTextInput
                      defaultValue={today}
                      id="workDate"
                      name="workDate"
                      required
                      type="date"
                    />
                  </HrField>
                  <HrField id="hours" label="Hours">
                    <HrTextInput
                      id="hours"
                      min="0.5"
                      name="hours"
                      placeholder="e.g. 2.5"
                      required
                      step="0.5"
                      type="number"
                    />
                  </HrField>
                </div>

                <HrField id="rateType" label="Rate type">
                  <HrSelect defaultValue="1.5" id="rateType" name="rateType" required>
                    <option value="1.5">1.5x (Normal workday OT)</option>
                    <option value="2.0">2.0x (Rest day OT)</option>
                    <option value="3.0">3.0x (Public holiday OT)</option>
                  </HrSelect>
                </HrField>

                <HrField id="reason" label="Reason">
                  <HrTextInput
                    id="reason"
                    name="reason"
                    placeholder="Reason for overtime work"
                  />
                </HrField>
              </>
            ) : null}

            {kind === "replacement" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <HrField id="workDate" label="Work date (worked on)">
                    <HrTextInput
                      defaultValue={today}
                      id="workDate"
                      name="workDate"
                      required
                      type="date"
                    />
                  </HrField>
                  <HrField id="creditDays" label="Credit days granted">
                    <HrTextInput
                      defaultValue="1"
                      id="creditDays"
                      min="0.5"
                      name="creditDays"
                      required
                      step="0.5"
                      type="number"
                    />
                  </HrField>
                </div>

                <HrField id="description" label="Reason / notes">
                  <HrTextInput
                    id="description"
                    name="description"
                    placeholder="e.g. Worked during Saturday company event"
                  />
                </HrField>
              </>
            ) : null}

            <HrFormMessage error={state.error} success={state.success} />

            <div className="flex justify-end gap-2 border-t pt-4">
              <HrLinkButton href={listHref} variant="outline">
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

