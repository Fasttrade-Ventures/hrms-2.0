"use client";

import { useActionState, useEffect, useState } from "react";
import { employeeClockIn, employeeClockOut, type EmployeeActionState } from "@/app/(employee)/employee/actions";

import type { GeofenceConfig } from "@/lib/attendance/geofence";
import type { TodayAttendance } from "@/lib/employee/attendance";

type LocationState = "idle" | "loading" | "ready" | "denied" | "unsupported";

const initialClockState: EmployeeActionState = {};

export function DashboardClockPanel({
  today,
  geofence,
  locationModuleEnabled,
}: {
  today: TodayAttendance | null;
  geofence: GeofenceConfig | null;
  locationModuleEnabled: boolean;
}) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [clockInState, clockInAction, clockInPending] = useActionState(
    async (prev: EmployeeActionState, formData: FormData) => {
      void prev;
      return employeeClockIn(formData);
    },
    initialClockState,
  );

  const [clockOutState, clockOutAction, clockOutPending] = useActionState(
    async (prev: EmployeeActionState) => {
      void prev;
      return employeeClockOut();
    },
    initialClockState,
  );

  // 1. Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setTimeStr(date.toLocaleTimeString("en-US", { hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Geolocation tracking
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

  const geofenceRequired = Boolean(geofence?.enabled);
  // Multi-session: allow clock-in again after clock-out (matches /employee/attendance).
  const isClockedIn = Boolean(today?.sessions?.some((session) => session.clockOutAt === null));
  const completedSessions = today?.sessions?.filter((session) => session.clockOutAt) ?? [];
  const lastCompleted = completedSessions[completedSessions.length - 1];
  const canClockIn = !isClockedIn && (!geofenceRequired || locationState === "ready");
  const canClockOut = isClockedIn;

  let statusText = "Not Clocked In Yet";
  let hintText = "Start Your Shift Today";
  if (isClockedIn) {
    statusText = "Active Shift";
    hintText = `Clocked In At ${new Date(today?.clockInAt ?? "").toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } else if (completedSessions.length > 0) {
    statusText = "Between Sessions";
    hintText = `Last Clocked Out At ${new Date(lastCompleted?.clockOutAt ?? "").toLocaleTimeString(
      "en-US",
      { hour: "numeric", minute: "2-digit" },
    )}`;
  }

  // Loc badge details
  let locText = "No Geofence";
  if (geofenceRequired) {
    if (locationState === "loading") locText = "Locating...";
    else if (locationState === "ready") locText = "In Range";
    else if (locationState === "denied") locText = "GPS Required";
    else locText = "Unresolved";
  }

  return (
    <div className="flex flex-1 flex-col justify-between rounded-[var(--radius-xl)] bg-gradient-to-br from-emerald-700 to-emerald-900 p-[20px] md:p-[22px] gap-[14px] text-white shadow-[var(--shadow-card)]">
      {/* Clock Top */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wider text-emerald-200">LIVE CLOCK</span>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight">{timeStr || "--:--:-- --"}</span>
        </div>
        
        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{locText}</span>
        </div>
      </div>

      {/* Clock Bottom */}
      <div className="flex items-end justify-between gap-4 mt-auto">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{statusText}</span>
          <span className="text-[11px] text-emerald-200 font-medium">{hintText}</span>
        </div>

        <div>
          {!isClockedIn ? (
            <form action={clockInAction}>
              <input name="latitude" type="hidden" value={coords?.latitude ?? ""} />
              <input name="longitude" type="hidden" value={coords?.longitude ?? ""} />
              <button
                type="submit"
                disabled={clockInPending || !canClockIn}
                className="w-[120px] sm:w-[130px] rounded-lg bg-white px-4 py-2.5 text-center text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-50"
              >
                {clockInPending
                  ? "Clocking In..."
                  : completedSessions.length > 0
                    ? "Clock In Again"
                    : "Clock In"}
              </button>
            </form>
          ) : canClockOut ? (
            <form action={clockOutAction}>
              <button
                type="submit"
                disabled={clockOutPending}
                className="w-[120px] sm:w-[130px] rounded-lg bg-white px-4 py-2.5 text-center text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-50"
              >
                {clockOutPending ? "Clocking Out..." : "Clock Out"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
      
      {/* Display errors if they occur */}
      {(clockInState.error || clockOutState.error) && (
        <div className="text-xs text-red-200 mt-1 font-medium">
          {clockInState.error || clockOutState.error}
        </div>
      )}
    </div>
  );
}
