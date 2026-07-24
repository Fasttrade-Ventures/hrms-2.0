"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { EmptyState, StatusPill } from "@hrms/ui";

import {
  submitBehalfLate,
  submitBehalfLeave,
  type ApplyBehalfActionState,
} from "@/app/(hr)/hr/apply-behalf/actions";
import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { BehalfApplicationRow, BehalfListData } from "@/lib/hr/apply-behalf";

function formatAppliedAt(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildListHref(params: { type?: string; range?: string }) {
  const query = new URLSearchParams();
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.range && params.range !== "all") query.set("range", params.range);
  const qs = query.toString();
  return qs ? `/hr/apply-behalf?${qs}` : "/hr/apply-behalf";
}

export function ApplyBehalfList({
  data,
  type,
  range,
  banner,
}: {
  data: BehalfListData;
  type: "all" | "leave" | "late";
  range: "all" | "week" | "history";
  banner?: string;
}) {
  const typeFilters = [
    { id: "all", label: "All" },
    { id: "leave", label: "Leave" },
    { id: "late", label: "Late" },
  ] as const;
  const rangeFilters = [
    { id: "all", label: "All time" },
    { id: "week", label: "This week" },
    { id: "history", label: "History" },
  ] as const;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            href="/hr/apply-behalf/new"
          >
            New application
          </Link>
        }
        description="Submit leave or late for any employee · auto-approved"
        title="Apply on behalf"
      />

      {banner ? (
        <div className="rounded-[12px] border border-[var(--accent-primary)]/30 bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--foreground-primary)]">
          {banner}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Behalf apps", value: data.stats.total, hint: "HR submitted" },
          { label: "Leave submitted", value: data.stats.leaveCount, hint: "auto-approved" },
          { label: "Late submitted", value: data.stats.lateCount, hint: "auto-approved" },
        ].map((stat) => (
          <div
            className="rounded-[14px] border border-[var(--border-primary)] bg-[var(--surface-card)] p-3.5 shadow-[var(--shadow-card)]"
            key={stat.label}
          >
            <p className="text-xs font-medium text-[var(--foreground-muted)]">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground-primary)]">{stat.value}</p>
            <p className="text-[11px] text-[var(--foreground-muted)]">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {typeFilters.map((item) => (
          <Link
            className={`inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 text-sm font-medium ${
              type === item.id
                ? "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
                : "border-[var(--border-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]"
            }`}
            href={buildListHref({ type: item.id, range })}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
        <span className="mx-1 self-center text-[var(--border-primary)]">|</span>
        {rangeFilters.map((item) => (
          <Link
            className={`inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 text-sm font-medium ${
              range === item.id
                ? "border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
                : "border-[var(--border-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-muted)]"
            }`}
            href={buildListHref({ type, range: item.id })}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="hidden grid-cols-6 gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] md:grid">
          <span>Type</span>
          <span>Employee</span>
          <span>Details</span>
          <span>Applied</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {data.rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              description="Use New application to submit leave or late for any employee."
              title="No behalf applications yet"
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {data.rows.map((row) => (
              <BehalfRow key={`${row.type}-${row.id}`} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BehalfRow({ row }: { row: BehalfApplicationRow }) {
  return (
    <div className="grid items-center gap-3 px-3.5 py-3 md:grid-cols-6">
      <div>
        <span
          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
            row.type === "leave"
              ? "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]"
              : "bg-[var(--danger-soft)] text-[var(--danger)]"
          }`}
        >
          {row.type === "leave" ? "Leave" : "Late"}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground-primary)]">{row.employeeName}</p>
        <p className="text-[11px] text-[var(--foreground-muted)]">{row.employeeNumber}</p>
      </div>
      <p className="text-sm text-[var(--foreground-secondary)]">{row.details}</p>
      <p className="text-sm text-[var(--foreground-muted)]">{formatAppliedAt(row.appliedAt)}</p>
      <StatusPill label={row.status === "approved" ? "Approved" : row.status} tone="success" />
      <div>
        <Link
          className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
          href={`/hr/employees/${row.employeeId}`}
        >
          View
        </Link>
      </div>
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
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/apply-behalf"
          >
            Back to list
          </Link>
        }
        description="Requests are saved as approved — no manager queue."
        title="New application"
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between bg-[var(--accent-primary)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Apply on behalf</h2>
            <p className="text-xs text-white/80">Leave or late · auto-approved</p>
          </div>
          <Link aria-label="Close" className="text-white/90 hover:text-white" href="/hr/apply-behalf">
            ✕
          </Link>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex gap-2">
            {(["leave", "late"] as const).map((item) => (
              <button
                className={`rounded-[8px] px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                  kind === item
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--foreground-secondary)]"
                }`}
                key={item}
                onClick={() => setKind(item)}
                type="button"
              >
                {item === "leave" ? "Leave" : "Late"}
              </button>
            ))}
          </div>

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

            <div className="flex justify-end gap-2 border-t border-[var(--border-primary)] pt-4">
              <Link href="/hr/apply-behalf">
                <HrGhostButton type="button">Cancel</HrGhostButton>
              </Link>
              <HrPrimaryButton disabled={pending} type="submit">
                {pending ? "Submitting…" : "Submit (auto-approve)"}
              </HrPrimaryButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
