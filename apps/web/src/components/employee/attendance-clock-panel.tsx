"use client";

import { useActionState } from "react";

import { employeeClockIn, employeeClockOut } from "@/app/(employee)/employee/actions";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { formatDateTime } from "@/components/employee/employee-shared";
import type { TodayAttendance } from "@/lib/employee/attendance";

export function AttendanceClockPanel({ today }: { today: TodayAttendance | null }) {
  const [clockInState, clockInAction, clockInPending] = useActionState(
    async (_prev: { error?: string; success?: string }) => employeeClockIn(),
    {},
  );
  const [clockOutState, clockOutAction, clockOutPending] = useActionState(
    async (_prev: { error?: string; success?: string }) => employeeClockOut(),
    {},
  );

  const message = clockInState.error || clockInState.success || clockOutState.error || clockOutState.success;

  return (
    <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Today</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Clock in</p>
          <p className="text-sm text-[var(--foreground-primary)]">{formatDateTime(today?.clockInAt ?? null)}</p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Clock out</p>
          <p className="text-sm text-[var(--foreground-primary)]">{formatDateTime(today?.clockOutAt ?? null)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={clockInAction}>
          <HrPrimaryButton disabled={clockInPending || Boolean(today?.clockInAt)} type="submit">
            {clockInPending ? "Clocking in…" : "Clock in"}
          </HrPrimaryButton>
        </form>
        <form action={clockOutAction}>
          <HrPrimaryButton
            className="bg-[var(--foreground-secondary)] hover:bg-[var(--foreground-primary)]"
            disabled={clockOutPending || !today?.clockInAt || Boolean(today?.clockOutAt)}
            type="submit"
          >
            {clockOutPending ? "Clocking out…" : "Clock out"}
          </HrPrimaryButton>
        </form>
      </div>

      {message ? <HrFormMessage error={message.startsWith("Clocked") ? undefined : message} success={message.startsWith("Clocked") ? message : undefined} /> : null}
    </section>
  );
}
