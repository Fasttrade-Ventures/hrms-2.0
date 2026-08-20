"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { Info, MapPinOff, Check, Loader2 } from "lucide-react";

import { employeeClockIn, employeeClockOut, type EmployeeActionState } from "@/app/(employee)/employee/actions";
import type { GeofenceConfig } from "@/lib/attendance/geofence";
import type { TodayAttendance } from "@/lib/employee/attendance";

type LocationState = "idle" | "loading" | "ready" | "denied" | "unsupported";

const initialClockState: EmployeeActionState = {};

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

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

  const [time, setTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [hoursSoFar, setHoursSoFar] = useState<string>("0h 00m");
  const [activeOverlay, setActiveOverlay] = useState<"success_in" | "success_out" | "already_clocked" | "gps_denied" | "geofence_outside" | null>(null);
  const [processedMessage, setProcessedMessage] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingClockInData, setPendingClockInData] = useState<FormData | null>(null);



  // Clock live timer
  useEffect(() => {
    setMounted(true);
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate working hours dynamically, accumulating all sessions
  useEffect(() => {
    if (!mounted || !today) {
      setHoursSoFar("0h 00m");
      return;
    }

    const accumulatedSeconds = today.accumulatedSeconds || 0;
    const activeClockIn = today.clockOutAt === null ? today.clockInAt : null;

    const calculateHours = () => {
      let totalSeconds = accumulatedSeconds;
      if (activeClockIn) {
        const diffMs = Date.now() - new Date(activeClockIn).getTime();
        if (diffMs > 0) {
          totalSeconds += Math.floor(diffMs / 1000);
        }
      }
      const totalMinutes = Math.floor(totalSeconds / 60);
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      setHoursSoFar(`${hrs}h ${mins.toString().padStart(2, "0")}m`);
    };

    calculateHours();
    if (activeClockIn) {
      const interval = setInterval(calculateHours, 1000); // Live ticking every second when active
      return () => clearInterval(interval);
    }
  }, [mounted, today, today?.accumulatedSeconds, today?.clockInAt, today?.clockOutAt]);

  // Load Leaflet dynamically and initialize map preview on coords change when confirmation modal is visible
  /* eslint-disable @typescript-eslint/no-explicit-any */
  useEffect(() => {
    if (!showConfirmModal || !coords) return;

    let map: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById("leaflet-map-preview");
      if (!container) return;

      // Clean up pre-existing Leaflet map inside this container just in case
      if ((container as any)._leaflet_id) {
        return;
      }

      map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
      }).setView([coords.latitude, coords.longitude], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Define default marker icons explicitly to bypass Leaflet's assets path resolution bugs
      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      L.marker([coords.latitude, coords.longitude], { icon: defaultIcon }).addTo(map);
    };

    if ((window as any).L) {
      const timeout = setTimeout(initMap, 50);
      return () => clearTimeout(timeout);
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        setTimeout(initMap, 50);
      };
      document.head.appendChild(script);
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [showConfirmModal, coords]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const currentMessage = clockInState.error || clockInState.success || clockOutState.error || clockOutState.success;

  // Sync action messages to popup modal overlays
  useEffect(() => {
    if (currentMessage && currentMessage !== processedMessage) {
      if (clockInState.success) {
        setActiveOverlay("success_in");
      } else if (clockOutState.success) {
        setActiveOverlay("success_out");
      } else if (currentMessage.toLowerCase().includes("already")) {
        setActiveOverlay("already_clocked");
      } else if (
        currentMessage.toLowerCase().includes("outside the allowed") ||
        currentMessage.toLowerCase().includes("out of range") ||
        currentMessage.toLowerCase().includes("geofence")
      ) {
        setActiveOverlay("geofence_outside");
      }
      setProcessedMessage(currentMessage);
    }
  }, [currentMessage, processedMessage, clockInState.success, clockOutState.success]);

  const geofenceRequired = Boolean(geofence?.enabled);

  // Intercept clock-in to check location first before calling action
  const handleClockInSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!locationModuleEnabled) {
      startTransition(() => {
        clockInAction(new FormData(e.currentTarget));
      });
      return;
    }

    if (!navigator.geolocation) {
      setLocationState("unsupported");
      setActiveOverlay("gps_denied");
      return;
    }

    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });

        const formData = new FormData();
        formData.append("latitude", lat.toString());
        formData.append("longitude", lng.toString());
        setPendingClockInData(formData);

        setLocationState("ready");
        setShowConfirmModal(true);
      },
      () => {
        setLocationState("denied");
        setActiveOverlay("gps_denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const isClockedIn = Boolean(today && today.clockInAt && today.clockOutAt === null);

  const getStatusBadge = () => {
    if (isClockedIn) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30 animate-pulse">
          Active
        </span>
      );
    }
    if (today && today.sessions.length > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200/30">
        Not clocked
      </span>
    );
  };

  const getStatusLabel = () => {
    if (isClockedIn) return "Clocked in";
    if (today && today.sessions.length > 0) return "Clocked out";
    return "Not clocked in";
  };

  const getLocationSubtext = () => {
    if (isClockedIn) {
      return `Clocked in at ${mounted ? formatTime(today?.clockInAt) : "—"}`;
    }
    if (today && today.sessions.length > 0) {
      const lastSession = today.sessions[today.sessions.length - 1];
      return `Clocked out at ${mounted ? formatTime(lastSession?.clockOutAt) : "—"}`;
    }
    if (geofenceRequired) {
      if (locationState === "idle") return "Location not verified yet";
      if (locationState === "loading") return "Verifying GPS location…";
      if (locationState === "ready") return "Location ready · within range";
      if (locationState === "denied") return "Location permission denied";
      if (locationState === "unsupported") return "GPS not supported on this device";
    }
    return "GPS check disabled";
  };

  const dismissOverlay = () => {
    setActiveOverlay(null);
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-5 items-stretch">
        {/* Live Clock Card (Col-span 3) */}
        <section className="md:col-span-3 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--surface-inverse)] text-white shadow-lg min-h-[220px]">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-[var(--foreground-inverse-accent)] uppercase">
              Live Clock
            </p>
            <h3 className="text-4xl font-extrabold tracking-tight mt-2 min-h-[48px] flex items-center">
              {mounted ? time : "--:--:-- --"}
            </h3>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 mt-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{getStatusLabel()}</p>
              <p className="text-xs text-[var(--foreground-inverse-accent)] flex items-center gap-1.5 font-medium">
                {locationState === "loading" && <Loader2 className="size-3 animate-spin" />}
                {getLocationSubtext()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isClockedIn ? (
                <form action={clockInAction} onSubmit={handleClockInSubmit}>
                  <input name="latitude" type="hidden" value={coords?.latitude ?? ""} />
                  <input name="longitude" type="hidden" value={coords?.longitude ?? ""} />
                  <button
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-[var(--accent-deep)] hover:bg-[var(--surface-primary)] active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2 cursor-pointer"
                    disabled={clockInPending || locationState === "loading"}
                    type="submit"
                  >
                    {clockInPending || locationState === "loading" ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        {locationState === "loading" ? "Verifying GPS…" : "Clocking in…"}
                      </>
                    ) : (
                      "Clock in"
                    )}
                  </button>
                </form>
              ) : (
                <form action={clockOutAction}>
                  <button
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-950/30 text-white border border-white/20 hover:bg-emerald-950/50 active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2 cursor-pointer"
                    disabled={clockOutPending}
                    type="submit"
                  >
                    {clockOutPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Clocking out…
                      </>
                    ) : (
                      "Clock out"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Today's Sessions Card (Col-span 2) */}
        <section className="md:col-span-2 flex flex-col justify-between p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-primary)] shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-[var(--foreground-primary)]">
              Today&apos;s sessions
            </h4>
            <div className="mt-4 space-y-3 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
              {today && today.sessions.length > 0 ? (
                today.sessions.map((session) => (
                  <div key={session.id} className="space-y-2 mb-3 last:mb-0">
                    <div className="flex justify-between items-center text-xs pb-1 border-b border-[var(--border-primary)]/30">
                      <span className="text-[var(--foreground-muted)] font-medium">Session {session.session} in</span>
                      <span className="font-semibold text-[var(--foreground-primary)]">
                        {mounted ? formatTime(session.clockInAt) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-1 border-b border-[var(--border-primary)]/30">
                      <span className="text-[var(--foreground-muted)] font-medium">Session {session.session} out</span>
                      <span className="font-semibold text-[var(--foreground-primary)]">
                        {mounted ? formatTime(session.clockOutAt) : "—"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-[var(--border-primary)]/30">
                    <span className="text-[var(--foreground-muted)] font-medium">Session 1 in</span>
                    <span className="font-semibold text-[var(--foreground-primary)]">—</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-[var(--border-primary)]/30">
                    <span className="text-[var(--foreground-muted)] font-medium">Session 1 out</span>
                    <span className="font-semibold text-[var(--foreground-primary)]">—</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--border-primary)]/40 flex justify-between items-center">
              <span className="text-xs text-[var(--foreground-muted)] font-bold">Total accumulated hours</span>
              <span className="text-sm font-extrabold text-[var(--foreground-primary)]">
                {mounted ? hoursSoFar : "0h 00m"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-2 border-t border-[var(--border-primary)]/20">
            <span className="text-xs text-[var(--foreground-muted)] font-medium">Status</span>
            {getStatusBadge()}
          </div>
        </section>
      </div>

      {/* Location tracking active notice box */}
      {locationModuleEnabled && !isClockedIn && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 text-sm mt-4 flex items-start gap-3 shadow-xs">
          <Info className="size-5 text-[var(--foreground-secondary)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--foreground-primary)]">
              Location tracking active
            </p>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Your GPS coordinates will be verified and recorded for attendance records.
            </p>
          </div>
        </div>
      )}

      {/* Overlay Modals */}
      {activeOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface-card)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Icon */}
            {activeOverlay === "success_in" && (
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[var(--success)] flex items-center justify-center shrink-0">
                <Check className="size-6" />
              </div>
            )}
            {activeOverlay === "success_out" && (
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[var(--success)] flex items-center justify-center shrink-0">
                <Check className="size-6" />
              </div>
            )}
            {activeOverlay === "gps_denied" && (
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <MapPinOff className="size-6" />
              </div>
            )}
            {activeOverlay === "already_clocked" && (
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Info className="size-6" />
              </div>
            )}
            {activeOverlay === "geofence_outside" && (
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                <MapPinOff className="size-6" />
              </div>
            )}

            {/* Modal Text */}
            <div className="text-center space-y-2">
              <h4 className="text-base font-bold text-[var(--foreground-primary)]">
                {activeOverlay === "success_in" && "Clocked in successfully"}
                {activeOverlay === "success_out" && "Clocked out successfully"}
                {activeOverlay === "gps_denied" && "Location required"}
                {activeOverlay === "already_clocked" && "Already clocked in"}
                {activeOverlay === "geofence_outside" && "Outside Allowed Area"}
              </h4>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                {activeOverlay === "success_in" &&
                  `Recorded at ${formatTime(today?.clockInAt || new Date().toISOString())} · ${geofence?.branchName || "HQ Branch"} · GPS verified`}
                {activeOverlay === "success_out" &&
                  `Recorded at ${formatTime(today?.clockOutAt || new Date().toISOString())} · ${geofence?.branchName || "HQ Branch"} · Session completed`}
                {activeOverlay === "gps_denied" &&
                  "Enable GPS to allow location tracking when clocking in."}
                {activeOverlay === "already_clocked" &&
                  `You clocked in at ${formatTime(today?.clockInAt)}. Clock out first before starting a new session.`}
                {activeOverlay === "geofence_outside" &&
                  "You are outside the allowed clock-in radius for this branch. Please move within the approved geofence to clock in."}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={dismissOverlay}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-sm transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Geolocation Confirmation Modal */}
      {showConfirmModal && coords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface-card)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="text-center space-y-1">
              <h4 className="text-lg font-extrabold text-[var(--foreground-primary)] flex items-center justify-center gap-2">
                <Check className="size-5 text-[var(--success)] shrink-0" />
                Confirm Geolocation
              </h4>
              <p className="text-xs text-[var(--foreground-muted)]">
                Review your location coordinates on the map before clocking in.
              </p>
            </div>

            {/* Map Preview */}
            <div className="w-full h-36 rounded-xl overflow-hidden border border-[var(--border-primary)]/80 relative bg-slate-100 shadow-inner">
              <div id="leaflet-map-preview" className="w-full h-full z-0" />
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-[9px] text-white px-2 py-0.5 rounded-full font-mono font-bold tracking-tight z-10">
                GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-primary)] bg-[var(--surface-card)] hover:bg-[var(--surface-primary)] text-[var(--foreground-secondary)] shadow-sm transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingClockInData) {
                    startTransition(() => {
                      clockInAction(pendingClockInData);
                    });
                  }
                  setShowConfirmModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-md transition-colors cursor-pointer text-center"
              >
                Confirm & Clock In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
