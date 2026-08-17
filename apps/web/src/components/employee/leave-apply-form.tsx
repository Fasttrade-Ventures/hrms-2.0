"use client";

import { useActionState, useEffect, useState } from "react";

import { applyLeave, type EmployeeActionState } from "@/app/(employee)/employee/actions";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import type { LeaveBalanceRow, LeaveTypeOption } from "@/lib/employee/leave";

const initialState: EmployeeActionState = {};

type DurationMode = "full" | "half_am" | "half_pm";

export function LeaveApplyForm({
  leaveTypes,
  balances,
  defaultStartDate,
  defaultEndDate,
}: {
  leaveTypes: LeaveTypeOption[];
  balances: LeaveBalanceRow[];
  defaultStartDate: string;
  defaultEndDate: string;
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

  // Calculates working days excluding Saturday & Sunday
  const calculateWorkingDays = (start: string, end: string, isHalfDay: boolean) => {
    if (!start || !end) return 0;
    const sDate = new Date(start);
    const eDate = new Date(end);
    if (sDate > eDate) return 0;

    let count = 0;
    const cur = new Date(sDate);
    while (cur <= eDate) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return isHalfDay ? count * 0.5 : count;
  };

  const workingDays = calculateWorkingDays(startDate, endDate, durationMode !== "full");

  return (
    <div className="space-y-6">
      {/* Balance Chips Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {balances.map((balance) => {
          const isSelected = selectedLeaveTypeId === balance.leaveTypeId;
          // Determine friendly label
          let label = "Other";
          const lowerName = balance.leaveTypeName.toLowerCase();
          if (lowerName.includes("annual")) label = "Annual";
          else if (lowerName.includes("medical")) label = "Medical";
          else if (lowerName.includes("emergency")) label = "Emergency";
          else if (lowerName.includes("replacement")) label = "Replacement";

          return (
            <button
              key={balance.leaveTypeId}
              type="button"
              onClick={() => setSelectedLeaveTypeId(balance.leaveTypeId)}
              className={`flex flex-col justify-between rounded-[var(--radius-xl)] p-3 px-3.5 gap-1 text-left transition shadow-[var(--shadow-card)] border ${
                isSelected
                  ? "bg-gradient-to-br from-emerald-700 to-emerald-900 border-transparent text-white"
                  : "bg-[var(--surface-card)] border-[var(--border-primary)] text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isSelected ? "text-emerald-200" : "text-[var(--foreground-secondary)]"
                }`}
              >
                {label}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold">{balance.remainingDays}</span>
                <span className={`text-[11px] ${isSelected ? "text-emerald-200" : "text-[var(--foreground-muted)]"}`}>
                  Days
                </span>
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
              onChange={(e) => setStartDate(e.target.value)}
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
            />
          </HrField>
        </div>

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

        <HrFormMessage error={state.error} success={state.success} />

        <div className="flex gap-3">
          <HrPrimaryButton disabled={pending} type="submit">
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
