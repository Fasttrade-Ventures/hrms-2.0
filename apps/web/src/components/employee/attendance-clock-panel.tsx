"use client";

import { useActionState, useEffect, useState } from "react";

import { employeeClockIn, employeeClockOut } from "@/app/(employee)/employee/actions";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { formatDateTime } from "@/components/employee/employee-shared";
import type { GeofenceConfig } from "@/lib/attendance/geofence";
import type { TodayAttendance } from "@/lib/employee/attendance";

type LocationState = "idle" | "loading" | "ready" | "denied" | "unsupported";

export function AttendanceClockPanel({
  today,
  geofence,
  locationModuleEnabled,
}: {
  today: TodayAttendance | null;
  geofence: GeofenceConfig | null;
  locationModuleEnabled: boolean;
}) {
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [clockInState, clockInAction, clockInPending] = useActionState(
    async (prev, formData) => {
      void prev;
      return employeeClockIn(formData);
    },
    {},
  );
  const [clockOutState, clockOutAction, clockOutPending] = useActionState(
    async (prev) => {
      void prev;
      return employeeClockOut();
    },
    {},
  );

  useEffect(() => {
    if (!locationModuleEnabled || !geofence?.enabled) {
      setLocationState("idle");
      return;
    }

    if (!navigator.geolocation) {
      setLocationState("unsupported");
      return;
    }

    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationState("ready");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [geofence?.enabled, locationModuleEnabled]);

  const message = clockInState.error || clockInState.success || clockOutState.error || clockOutState.success;
  const geofenceRequired = Boolean(geofence?.enabled);
  const canClockIn = !today?.clockInAt && (!geofenceRequired || locationState === "ready");

  return (
    <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
      <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Today</h2>

      {geofence?.enabled ? (
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-muted)]/50 px-4 py-3 text-sm">
          <p className="font-medium text-[var(--foreground-primary)]">GPS check — {geofence.branchName}</p>
          <p className="mt-1 text-[var(--foreground-muted)]">
            You must be within {geofence.radiusMeters}m of the branch to clock in normally.
          </p>
          <p className="mt-2 text-xs text-[var(--foreground-secondary)]">
            {locationState === "loading" && "Detecting your location…"}
            {locationState === "ready" && "Location ready."}
            {locationState === "denied" && "Location permission denied. Enable GPS to clock in."}
            {locationState === "unsupported" && "This device does not support GPS."}
          </p>
        </div>
      ) : null}

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

      {today?.status === "out_of_range" ? (
        <p className="text-sm text-amber-700">Clock-in recorded outside the branch geofence.</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <form action={clockInAction}>
          <input name="latitude" type="hidden" value={coords?.latitude ?? ""} />
          <input name="longitude" type="hidden" value={coords?.longitude ?? ""} />
          <HrPrimaryButton disabled={clockInPending || !canClockIn} type="submit">
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

      {message ? (
        <HrFormMessage
          error={message.startsWith("Clocked") ? undefined : message}
          success={message.startsWith("Clocked") ? message : undefined}
        />
      ) : null}
    </section>
  );
}
