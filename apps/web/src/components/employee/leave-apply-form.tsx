"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock,
  FileMinus,
  HeartPulse,
} from "lucide-react";

import { applyLeave, type EmployeeActionState } from "@/app/(employee)/employee/actions";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { countWorkingDays } from "@hrms/domain";
import { findOverlappingLeave, type LeaveDateSpan } from "@/lib/leave/overlap-utils";
import type { LeaveBalanceRow, LeaveTypeOption } from "@/lib/employee/leave";

const initialState: EmployeeActionState = {};

type DurationMode = "full" | "half_am" | "half_pm";

function formatLeaveLabel(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("annual")) return "Annual";
  if (lower.includes("medical") || lower.includes("mc")) return "Medical";
  if (lower.includes("hospital")) return "Hospitalization";
  if (lower.includes("replacement")) return "Replacement";
  if (lower.includes("emergency")) return "Emergency";
  if (lower.includes("unpaid")) return "Unpaid";
  if (lower.includes("maternity")) return "Maternity";
  if (lower.includes("paternity")) return "Paternity";
  if (lower.includes("compassionate")) return "Compassionate";
  if (lower.includes("marriage")) return "Marriage";
  const cleaned = name.replace(/\s*leave\b/gi, "").trim();
  return cleaned || name;
}

function getLeaveIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("annual")) return Calendar;
  if (lower.includes("medical") || lower.includes("mc")) return HeartPulse;
  if (lower.includes("hospital")) return Building2;
  if (lower.includes("replacement")) return Clock;
  if (lower.includes("emergency")) return AlertCircle;
  if (lower.includes("unpaid")) return FileMinus;
  return Briefcase;
}

function getLeaveTypePriority(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("annual")) return 1;
  if (lower.includes("medical") || lower.includes("mc")) return 2;
  if (lower.includes("hospital")) return 3;
  if (lower.includes("replacement")) return 4;
  if (lower.includes("emergency")) return 5;
  if (lower.includes("unpaid")) return 99;
  return 50;
}

export function LeaveApplyForm({
  leaveTypes,
  balances,
  defaultStartDate,
  defaultEndDate,
  existingRequests = [],
  holidays = [],
}: {
  leaveTypes: LeaveTypeOption[];
  balances: LeaveBalanceRow[];
  defaultStartDate: string;
  defaultEndDate: string;
  existingRequests?: LeaveDateSpan[];
  holidays?: string[];
}) {
  const [state, formAction, pending] = useActionState(applyLeave, initialState);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [durationMode, setDurationMode] = useState<DurationMode>("full");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString("en-CA"));
  }, []);

  const selectedType = leaveTypes.find((t) => t.id === selectedLeaveTypeId);
  const requiresAttachment = selectedType?.requiresAttachment ?? false;

  // Check if selected dates overlap with any active leave request
  const overlappingRequest = findOverlappingLeave(startDate, endDate, existingRequests);

  // Calculates working days excluding Saturday & Sunday, and observed public holidays
  const calculateWorkingDays = (start: string, end: string, isHalfDay: boolean) => {
    if (!start || !end) return 0;
    const sDate = new Date(`${start}T00:00:00`);
    const eDate = new Date(`${end}T00:00:00`);
    if (sDate > eDate) return 0;

    return countWorkingDays(sDate, eDate, {
      weekendMode: "sat_sun",
      halfDay: isHalfDay,
      holidays,
    });
  };

  const workingDays = calculateWorkingDays(startDate, endDate, durationMode !== "full");
  const selectedBalance = balances.find((b) => b.leaveTypeId === selectedLeaveTypeId);
  const overBalance =
    Boolean(selectedLeaveTypeId) &&
    !selectedType?.isUnpaid &&
    workingDays > 0 &&
    selectedBalance != null &&
    workingDays > selectedBalance.remainingDays;

  const entitlementBalances = useMemo(() => {
    return balances
      .filter((b) => {
        const matchingType = leaveTypes.find((t) => t.id === b.leaveTypeId);
        return !matchingType?.isUnpaid && !b.leaveTypeName.toLowerCase().includes("unpaid");
      })
      .sort(
        (a, b) => getLeaveTypePriority(a.leaveTypeName) - getLeaveTypePriority(b.leaveTypeName),
      );
  }, [balances, leaveTypes]);

  const gridColsClass =
    entitlementBalances.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : entitlementBalances.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : entitlementBalances.length === 4
      ? "grid-cols-2 md:grid-cols-4"
      : entitlementBalances.length === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";

  return (
    <div className="space-y-6">
      {/* Balance Chips Row */}
      <div className={`grid ${gridColsClass} gap-3`}>
        {entitlementBalances.map((balance, idx) => {
          const isSelected = selectedLeaveTypeId === balance.leaveTypeId;
          const label = formatLeaveLabel(balance.leaveTypeName);
          const Icon = getLeaveIcon(balance.leaveTypeName);
          const isLastAndOdd =
            idx === entitlementBalances.length - 1 && entitlementBalances.length % 2 !== 0;

          return (
            <button
              key={balance.leaveTypeId}
              type="button"
              onClick={() => setSelectedLeaveTypeId(isSelected ? "" : balance.leaveTypeId)}
              aria-pressed={isSelected}
              className={`group relative flex flex-col justify-between rounded-[var(--radius-xl)] p-3.5 text-left transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? "bg-gradient-to-br from-[#1b3a28] via-[#234a2e] to-[#2d5e3a] border-transparent text-white shadow-md shadow-[#1b3a28]/20 ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--surface-primary)]"
                  : "bg-[var(--surface-card)] border-[var(--border-primary)] text-[var(--foreground-primary)] shadow-[var(--shadow-card)] hover:border-[var(--border-focus)]/50 hover:-translate-y-0.5 hover:shadow-md"
              } ${isLastAndOdd ? "col-span-2 sm:col-span-1 lg:col-span-1" : ""}`}
            >
              {/* Top Row: Category Label & Icon / Check indicator */}
              <div className="flex items-center justify-between gap-1 w-full">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                    isSelected ? "text-emerald-200" : "text-[var(--foreground-secondary)]"
                  }`}
                  title={label}
                >
                  {label}
                </span>
                <div className="flex items-center shrink-0">
                  {isSelected ? (
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-white/20 text-emerald-100">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-[var(--foreground-muted)] group-hover:text-[var(--foreground-secondary)] transition-colors" />
                  )}
                </div>
              </div>

              {/* Center: Main numeric value */}
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {balance.remainingDays}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isSelected ? "text-emerald-200/90" : "text-[var(--foreground-muted)]"
                  }`}
                >
                  days
                </span>
              </div>

              {/* Bottom: Context info */}
              <div className="mt-1 flex items-center justify-between text-[10px] w-full">
                {balance.pendingDays > 0 ? (
                  <span className={isSelected ? "text-amber-300 font-medium" : "text-amber-600 font-medium"}>
                    {balance.pendingDays} pending
                  </span>
                ) : balance.entitlementDays > 0 ? (
                  <span className={isSelected ? "text-emerald-200/70" : "text-[var(--foreground-muted)]"}>
                    of {balance.entitlementDays} total
                  </span>
                ) : (
                  <span className={isSelected ? "text-emerald-200/70" : "text-[var(--foreground-muted)]"}>
                    Earned credit
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* New Application Form */}
      <form
        action={formAction}
        className="space-y-5 rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]"
      >
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">New Application</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <HrField id="leaveTypeId" label="Leave Type">
            <HrSelect
              value={selectedLeaveTypeId}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
              id="leaveTypeId"
              name="leaveTypeId"
              required
            >
              <option disabled value="">
                Select Leave Type
              </option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.isUnpaid ? " (Unpaid)" : ""}
                </option>
              ))}
            </HrSelect>
          </HrField>

          {/* Duration Toggle Buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[var(--foreground-secondary)]">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {(["full", "half_am", "half_pm"] as const).map((mode) => {
                const label = mode === "full" ? "Full Day" : mode === "half_am" ? "Half AM" : "Half PM";
                const isSelected = durationMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDurationMode(mode)}
                    className={`h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition ${
                      isSelected
                        ? "bg-[var(--accent-primary)] border-transparent text-white shadow-sm"
                        : "bg-[var(--surface-muted)] border-[var(--border-primary)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="halfDay" value={durationMode !== "full" ? "true" : "false"} />
          </div>

          <HrField id="startDate" label="From">
            <HrTextInput
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (durationMode !== "full") {
                  setEndDate(e.target.value);
                }
              }}
              id="startDate"
              name="startDate"
              required
              type="date"
              min={todayStr || undefined}
            />
          </HrField>

          <HrField id="endDate" label="To">
            <HrTextInput
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              id="endDate"
              name="endDate"
              required
              type="date"
              min={startDate || todayStr || undefined}
              disabled={durationMode !== "full"}
            />
          </HrField>
        </div>

        {startDate && endDate && workingDays === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Selected dates fall entirely on non-working days (weekends or observed public holidays).
          </p>
        )}

        {requiresAttachment && (
          <HrField id="file" label="Supporting Document (Medical Certificate, etc.)">
            <input
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              id="file"
              name="file"
              required
              type="file"
            />
          </HrField>
        )}

        <HrField id="reason" label="Reason">
          <HrTextInput id="reason" name="reason" placeholder="Optional" />
        </HrField>

        {startDate && endDate && (
          <div className="rounded-lg bg-[var(--surface-accent-soft)] p-3 px-3.5 flex justify-between items-center text-xs font-semibold text-[var(--accent-primary)]">
            <span>Calculated Working Days</span>
            <span>{workingDays} Day{workingDays === 1 ? "" : "s"}</span>
          </div>
        )}

        {/* Overlap Conflict Notice */}
        {overlappingRequest && (
          <div className="rounded-[var(--radius-lg)] border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-[var(--foreground-primary)]">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div className="space-y-1">
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  Date Conflict: Leave already requested
                </p>
                <p className="text-[var(--foreground-secondary)]">
                  You already have an active <span className="font-medium capitalize">{overlappingRequest.status}</span> {overlappingRequest.leaveTypeName ?? "leave"} request covering {overlappingRequest.startDate} to {overlappingRequest.endDate}.
                  You must cancel that leave request first before you can apply for these dates again.
                </p>
                {overlappingRequest.id && (
                  <div className="pt-1.5">
                    <Link
                      href={`/employee/leave/${overlappingRequest.id}`}
                      className="font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      View or cancel existing request →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {overBalance ? (
          <p className="text-xs font-medium text-destructive">
            Insufficient balance. Remaining: {selectedBalance?.remainingDays ?? 0} day(s).
          </p>
        ) : null}

        <HrFormMessage error={state.error} success={state.success} />

        <div className="flex gap-3">
          <HrPrimaryButton disabled={pending || overBalance || Boolean(overlappingRequest)} type="submit">
            {pending ? "Submitting..." : "Submit Leave Request"}
          </HrPrimaryButton>
          <HrGhostButton
            disabled={pending}
            type="button"
            onClick={() => {
              setSelectedLeaveTypeId("");
              setDurationMode("full");
              setStartDate(defaultStartDate);
              setEndDate(defaultEndDate);
            }}
          >
            Clear
          </HrGhostButton>
        </div>
      </form>
    </div>
  );
}
