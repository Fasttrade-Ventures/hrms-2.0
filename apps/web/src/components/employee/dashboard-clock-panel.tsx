"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { MapPinOff, Check, Loader2 } from "lucide-react";
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
  const [activeOverlay, setActiveOverlay] = useState<"gps_denied" | "geofence_outside" | null>(null);
  const [processedMessage, setProcessedMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingClockInData, setPendingClockInData] = useState<FormData | null>(null);
  const [mounted, setMounted] = useState(false);

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

  // Sync action messages to popup modal overlays
  const currentMessage = clockInState.error || clockOutState.error;
  useEffect(() => {
    if (currentMessage && currentMessage !== processedMessage) {
      if (
        currentMessage.toLowerCase().includes("outside the allowed") ||
        currentMessage.toLowerCase().includes("out of range") ||
        currentMessage.toLowerCase().includes("geofence")
      ) {
        setActiveOverlay("geofence_outside");
      } else if (currentMessage.toLowerCase().includes("location is required")) {
        setActiveOverlay("gps_denied");
      }
      setProcessedMessage(currentMessage);
    }
  }, [currentMessage, processedMessage]);

  // 1. Live ticking clock
  useEffect(() => {
    setMounted(true);
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

  // 3. Load Leaflet dynamically and initialize map preview on coords change when confirmation modal is visible
  /* eslint-disable @typescript-eslint/no-explicit-any */
  useEffect(() => {
    if (!showConfirmModal || !coords) return;

    let map: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById("leaflet-dashboard-map-preview");
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
    hintText = mounted && today?.clockInAt
      ? `Clocked In At ${new Date(today.clockInAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "Clocked In At ...";
  } else if (completedSessions.length > 0) {
    statusText = "Between Sessions";
    hintText = mounted && lastCompleted?.clockOutAt
      ? `Last Clocked Out At ${new Date(lastCompleted.clockOutAt).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit" },
        )}`
      : "Last Clocked Out At ...";
  }

  // Intercept clock-in to show confirm modal first
  const handleClockInSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!locationModuleEnabled || !geofenceRequired) {
      startTransition(() => {
        clockInAction(new FormData(e.currentTarget));
      });
      return;
    }

    if (locationState === "denied" || locationState === "unsupported") {
      setActiveOverlay("gps_denied");
      return;
    }

    if (coords) {
      const formData = new FormData(e.currentTarget);
      formData.set("latitude", coords.latitude.toString());
      formData.set("longitude", coords.longitude.toString());
      setPendingClockInData(formData);
      setShowConfirmModal(true);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col justify-between rounded-[var(--radius-xl)] bg-gradient-to-br from-emerald-700 to-emerald-900 p-[20px] md:p-[22px] gap-[14px] text-white shadow-[var(--shadow-card)]">
        {/* Clock Top */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-emerald-200">LIVE CLOCK</span>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">{timeStr || "--:--:-- --"}</span>
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
              <form action={clockInAction} onSubmit={handleClockInSubmit}>
                <input name="latitude" type="hidden" value={coords?.latitude ?? ""} />
                <input name="longitude" type="hidden" value={coords?.longitude ?? ""} />
                <button
                  type="submit"
                  disabled={clockInPending || !canClockIn || locationState === "loading"}
                  className="w-[120px] sm:w-[130px] rounded-lg bg-white px-4 py-2.5 text-center text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {clockInPending || locationState === "loading" ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      {locationState === "loading" ? "Locating..." : "Clocking In..."}
                    </>
                  ) : completedSessions.length > 0 ? (
                    "Clock In Again"
                  ) : (
                    "Clock In"
                  )}
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
        
        {/* Display errors if they occur (excluding geofence/location errors shown in modals) */}
        {(clockInState.error || clockOutState.error) && 
         !(clockInState.error?.toLowerCase().includes("outside the allowed") || 
           clockInState.error?.toLowerCase().includes("out of range") || 
           clockInState.error?.toLowerCase().includes("location is required")) && (
          <div className="text-xs text-red-200 mt-1 font-medium">
            {clockInState.error || clockOutState.error}
          </div>
        )}
      </div>

      {/* Geofence Overlay Modal */}
      {activeOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface-card)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {activeOverlay === "gps_denied" && (
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <MapPinOff className="size-6" />
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
                {activeOverlay === "gps_denied" && "Location required"}
                {activeOverlay === "geofence_outside" && "Outside Allowed Area"}
              </h4>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                {activeOverlay === "gps_denied" &&
                  "Enable GPS to allow location tracking when clocking in."}
                {activeOverlay === "geofence_outside" &&
                  "You are outside the allowed clock-in radius for this branch. Please move within the approved geofence to clock in."}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setActiveOverlay(null)}
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
              <div id="leaflet-dashboard-map-preview" className="w-full h-full z-0" />
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
